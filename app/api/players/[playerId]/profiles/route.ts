import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { sql } from "@/db";

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
  const token = await getToken({ req });
  const parentId = token?.sub;
  if (!parentId) return new Response("Unauthorized", { status: 401 });

  const { playerId } = await ctx.params;

  // Ensure this player belongs to the logged-in parent.
  const owns = (await sql`
    SELECT 1
    FROM players
    WHERE id = ${playerId} AND parent_id = ${parentId}
    LIMIT 1
  `) as unknown as Array<{ "?column?": number }>;

  if (owns.length === 0) return new Response("Not found", { status: 404 });

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
