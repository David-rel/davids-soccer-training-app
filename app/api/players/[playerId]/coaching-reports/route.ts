import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const rows = (await sql`
    SELECT id, player_id, type, title, report_date::text AS report_date, content, created_at, updated_at
    FROM player_coaching_reports
    WHERE player_id = ${playerId}
    ORDER BY report_date DESC, created_at DESC
  `) as unknown as unknown[];

  return Response.json({ reports: rows });
}
