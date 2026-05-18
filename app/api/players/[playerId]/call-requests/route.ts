import { NextRequest } from "next/server";
import { sql } from "@/db";
import { sendSmsViaTwilio } from "@/lib/twilio";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CallRequestRow = {
  id: string;
  player_id: string;
  parent_id: string;
  duration_minutes: number;
  availability: string;
  notes: string | null;
  status: string;
  seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const requests = (await sql`
    SELECT id, player_id, parent_id, duration_minutes, availability, notes,
           status, seen_at, created_at, updated_at
    FROM player_call_requests
    WHERE player_id = ${playerId}
    ORDER BY created_at DESC
  `) as unknown as CallRequestRow[];

  return Response.json({ requests });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const { duration_minutes, availability, notes } = body as {
    duration_minutes?: unknown;
    availability?: unknown;
    notes?: unknown;
  };

  if (duration_minutes !== 30 && duration_minutes !== 60) {
    return new Response("duration_minutes must be 30 or 60", { status: 400 });
  }
  if (!availability || typeof availability !== "string" || !availability.trim()) {
    return new Response("availability is required", { status: 400 });
  }

  const rows = (await sql`
    INSERT INTO player_call_requests (player_id, parent_id, duration_minutes, availability, notes)
    VALUES (
      ${playerId},
      ${auth.parentId},
      ${duration_minutes as number},
      ${(availability as string).trim()},
      ${notes && typeof notes === "string" ? notes.trim() || null : null}
    )
    RETURNING id, player_id, parent_id, duration_minutes, availability, notes,
              status, seen_at, created_at, updated_at
  `) as unknown as CallRequestRow[];

  const request = rows[0];

  // Fire-and-forget SMS to coach
  Promise.resolve().then(async () => {
    try {
      const playerRows = (await sql`
        SELECT p.name, pa.email
        FROM players p
        INNER JOIN parents pa ON pa.id = p.parent_id
        WHERE p.id = ${playerId}
        LIMIT 1
      `) as unknown as Array<{ name: string; email: string | null }>;

      if (playerRows.length > 0) {
        const player = playerRows[0];
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        await sendSmsViaTwilio(
          `📞 Call request from ${player.name} (${player.email ?? "no email"}): ${duration_minutes} min call. Available: ${(availability as string).trim()}. Check admin: ${baseUrl}/admin/player/${playerId}`,
          { to: "+17206122979" }
        ).catch(() => {});
      }
    } catch {
      // ignore
    }
  }).catch(() => {});

  return Response.json({ request }, { status: 201 });
}
