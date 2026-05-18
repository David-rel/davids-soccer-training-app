import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
