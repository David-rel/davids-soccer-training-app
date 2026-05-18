import { NextRequest } from "next/server";

import { sql } from "@/db";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

type PlayerSessionParentRow = {
  id: string;
  player_id: string;
  session_date: string; // YYYY-MM-DD
  title: string;
  document_upload_url: string | null;
  session_plan: string | null;
  focus_areas: string | null;
  activities: string | null;
  things_to_try: string | null;
  notes: string | null;
  published_at: string | null;
  created_at: string;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
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
      document_upload_url,
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
