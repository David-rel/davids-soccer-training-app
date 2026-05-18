import { NextRequest } from "next/server";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";
import { sql } from "@/db";

type PlayerTestRow = {
  id: string;
  player_id: string;
  test_name: string;
  test_date: string; // YYYY-MM-DD
  scores: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const rows = (await sql`
    SELECT
      id,
      player_id,
      test_name,
      test_date::text AS test_date,
      scores,
      created_at,
      updated_at
    FROM player_tests
    WHERE player_id = ${playerId}
    ORDER BY test_date DESC, created_at DESC
    LIMIT 200
  `) as unknown as PlayerTestRow[];

  return Response.json({ tests: rows });
}
