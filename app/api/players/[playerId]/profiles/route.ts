import { NextRequest } from "next/server";

import { sql } from "@/db";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

type PlayerProfileRow = {
  id: string;
  player_id: string;
  name: string;
  computed_at: string;
  data: unknown;
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
      name,
      computed_at,
      data
    FROM player_profiles
    WHERE player_id = ${playerId}
    ORDER BY computed_at ASC, created_at ASC
    LIMIT 50
  `) as unknown as PlayerProfileRow[];

  return Response.json({ profiles: rows });
}
