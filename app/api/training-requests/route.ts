import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";
import { sendSmsViaTwilio } from "@/lib/twilio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const parentId = token?.sub;
  if (!parentId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const { parent_name, player_name, availability, phone, email, location } =
    body as Record<string, unknown>;

  if (!parent_name || typeof parent_name !== "string" || !parent_name.trim()) {
    return new Response("parent_name is required", { status: 400 });
  }
  if (!player_name || typeof player_name !== "string" || !player_name.trim()) {
    return new Response("player_name is required", { status: 400 });
  }
  if (!availability || typeof availability !== "string" || !availability.trim()) {
    return new Response("availability is required", { status: 400 });
  }

  const rows = (await sql`
    INSERT INTO training_requests
      (parent_id, parent_name, player_name, phone, email, location, availability)
    VALUES (
      ${parentId},
      ${parent_name.trim()},
      ${player_name.trim()},
      ${phone && typeof phone === "string" ? phone.trim() || null : null},
      ${email && typeof email === "string" ? email.trim() || null : null},
      ${location && typeof location === "string" ? location.trim() || null : null},
      ${availability.trim()}
    )
    RETURNING id, parent_id, parent_name, player_name, phone, email, location,
              availability, status, seen_at, created_at, updated_at
  `) as unknown as Array<Record<string, unknown>>;

  const request = rows[0];

  Promise.resolve()
    .then(async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        await sendSmsViaTwilio(
          `🗓 Training request from ${parent_name.trim()} for ${player_name.trim()}.\nPhone: ${phone ?? "—"}. Email: ${email ?? "—"}. Location: ${location ?? "—"}.\nAvailable: ${availability.trim()}.\nCheck: ${baseUrl}/admin/training-requests`,
          { to: "+17206122979" }
        ).catch(() => {});
      } catch {
        // ignore
      }
    })
    .catch(() => {});

  return Response.json({ request }, { status: 201 });
}
