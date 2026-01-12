import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { sql } from "@/db";

type PlayerSessionParentRow = {
  id: string;
  player_id: string;
  session_date: string; // YYYY-MM-DD
  title: string;
  session_plan: string | null;
  focus_areas: string | null;
  activities: string | null;
  things_to_try: string | null;
  notes: string | null;
  published_at: string | null;
  created_at: string;
};

async function assertOwnsPlayer(req: NextRequest, playerId: string) {
  const token = await getToken({ req });
  const parentId = token?.sub;
  if (!parentId)
    return {
      ok: false as const,
      res: new Response("Unauthorized", { status: 401 }),
    };

  const owns = (await sql`
    SELECT 1
    FROM players
    WHERE id = ${playerId} AND parent_id = ${parentId}
    LIMIT 1
  `) as unknown as Array<{ "?column?": number }>;

  if (owns.length === 0)
    return {
      ok: false as const,
      res: new Response("Not found", { status: 404 }),
    };
  return { ok: true as const, parentId };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  // SECURITY: Only return published sessions and exclude admin_notes
  const rows = (await sql`
    SELECT
      id,
      player_id,
      session_date::text AS session_date,
      title,
      session_plan,
      focus_areas,
      activities,
      things_to_try,
      notes,
      published_at,
      created_at
    FROM player_sessions
    WHERE player_id = ${playerId} AND published = true
    ORDER BY session_date DESC, created_at DESC
    LIMIT 500
  `) as unknown as PlayerSessionParentRow[];

  return Response.json({ sessions: rows });
}
