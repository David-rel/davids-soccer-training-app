import { NextRequest } from "next/server";

import { syncCoachReminders } from "@/lib/coachReminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same auth shape as the birthday job: Vercel Cron sends the secret as a
// bearer token.
function isAuthorized(req: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await syncCoachReminders();
  return Response.json({ ok: true, ...result });
}
