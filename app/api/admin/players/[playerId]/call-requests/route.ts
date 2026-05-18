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
  parent_email: string | null;
  parent_phone: string | null;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const requests = (await sql`
    SELECT
      cr.id, cr.player_id, cr.parent_id, cr.duration_minutes,
      cr.availability, cr.notes, cr.status, cr.seen_at,
      cr.created_at, cr.updated_at,
      pa.email AS parent_email,
      pa.phone AS parent_phone
    FROM player_call_requests cr
    INNER JOIN parents pa ON pa.id = cr.parent_id
    WHERE cr.player_id = ${playerId}
    ORDER BY cr.created_at DESC
  `) as unknown as CallRequestRow[];

  return Response.json({ requests });
}
