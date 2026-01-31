import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function assertOwnsPlayer(req: NextRequest, playerId: string) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
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

  try {
    // Get videos that are started but not completed, ordered by last watched
    const videos = await sql`
      SELECT
        v.id, v.title, v.description, v.video_url, v.category,
        v.thumbnail_url, v.duration, v.channel, v.created_at,
        ve.last_position_seconds,
        ve.total_watch_time_seconds,
        ve.last_watched_at,
        ve.watch_count,
        ve.rating_stars
      FROM videos v
      INNER JOIN video_engagement ve ON v.id = ve.video_id
      WHERE ve.player_id = ${playerId}
        AND ve.watched = true
        AND ve.completed = false
        AND v.published = true
        AND ve.last_position_seconds > 0
      ORDER BY ve.last_watched_at DESC
      LIMIT 20
    `;

    return Response.json({ videos });
  } catch (error) {
    console.error("Error fetching continue watching:", error);
    return Response.json(
      { error: "Failed to fetch continue watching videos" },
      { status: 500 }
    );
  }
}
