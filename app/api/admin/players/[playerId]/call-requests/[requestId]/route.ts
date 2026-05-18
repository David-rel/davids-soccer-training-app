import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; requestId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId, requestId } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const { status } = body as { status?: unknown };
  if (status !== "seen") {
    return new Response("status must be 'seen'", { status: 400 });
  }

  const rows = (await sql`
    UPDATE player_call_requests
    SET status = 'seen', seen_at = now(), updated_at = now()
    WHERE id = ${requestId} AND player_id = ${playerId}
    RETURNING id, player_id, parent_id, duration_minutes, availability, notes,
              status, seen_at, created_at, updated_at
  `) as unknown as CallRequestRow[];

  if (rows.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json({ request: rows[0] });
}
