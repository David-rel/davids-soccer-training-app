import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { sql } from "@/db";

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

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; videoId: string }> }
) {
  // 1. Authentication & Authorization
  const { playerId, videoId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  // 2. Parse request body
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    rating?: number;
    position?: number; // Playback position in seconds
    totalTime?: number; // Total watch time in seconds
  } | null;

  if (!body || !body.action) {
    return new Response("Missing action parameter", { status: 400 });
  }

  const { action, rating, position, totalTime } = body;
  const now = new Date().toISOString();

  try {
    // 3. Handle different engagement actions
    if (action === "watch") {
      // Mark video as watched, increment watch count, track progress
      // Default to position 1 (not 0) so video appears in continue watching
      const defaultPosition = position !== undefined ? position : 1;

      await sql`
        INSERT INTO video_engagement (
          player_id, video_id, watched, watch_count,
          first_watched_at, last_watched_at, started_at,
          last_position_seconds, total_watch_time_seconds
        )
        VALUES (
          ${playerId}, ${videoId}, true, 1, ${now}, ${now}, ${now},
          ${defaultPosition}, ${totalTime || 0}
        )
        ON CONFLICT (player_id, video_id)
        DO UPDATE SET
          watched = true,
          watch_count = video_engagement.watch_count + 1,
          last_watched_at = ${now},
          first_watched_at = COALESCE(video_engagement.first_watched_at, ${now}),
          started_at = COALESCE(video_engagement.started_at, ${now}),
          last_position_seconds = CASE
            WHEN video_engagement.last_position_seconds = 0 THEN ${defaultPosition}
            ELSE COALESCE(${position}, video_engagement.last_position_seconds)
          END,
          total_watch_time_seconds = COALESCE(${totalTime}, video_engagement.total_watch_time_seconds),
          updated_at = ${now}
      `;

      return Response.json({ success: true, action: "watch" });
    } else if (action === "progress") {
      // Update watch progress (for continue watching feature)
      await sql`
        INSERT INTO video_engagement (
          player_id, video_id, watched, watch_count,
          started_at, last_watched_at,
          last_position_seconds, total_watch_time_seconds
        )
        VALUES (
          ${playerId}, ${videoId}, true, 1, ${now}, ${now},
          ${position || 0}, ${totalTime || 0}
        )
        ON CONFLICT (player_id, video_id)
        DO UPDATE SET
          last_position_seconds = ${position || 0},
          total_watch_time_seconds = ${totalTime || 0},
          last_watched_at = ${now},
          updated_at = ${now}
      `;

      return Response.json({ success: true, action: "progress" });
    } else if (action === "complete") {
      // Mark as completed (implies watched)
      await sql`
        INSERT INTO video_engagement (
          player_id, video_id, watched, completed, watch_count,
          first_watched_at, last_watched_at, completed_at
        )
        VALUES (
          ${playerId}, ${videoId}, true, true, 1, ${now}, ${now}, ${now}
        )
        ON CONFLICT (player_id, video_id)
        DO UPDATE SET
          watched = true,
          completed = true,
          completed_at = COALESCE(video_engagement.completed_at, ${now}),
          last_watched_at = ${now},
          first_watched_at = COALESCE(video_engagement.first_watched_at, ${now}),
          updated_at = ${now}
      `;

      return Response.json({ success: true, action: "complete" });
    } else if (action === "rate") {
      // Store rating (1-5 stars)
      if (!rating || rating < 1 || rating > 5) {
        return new Response("Rating must be between 1 and 5", { status: 400 });
      }

      await sql`
        INSERT INTO video_engagement (
          player_id, video_id, rating_stars
        )
        VALUES (
          ${playerId}, ${videoId}, ${rating}
        )
        ON CONFLICT (player_id, video_id)
        DO UPDATE SET
          rating_stars = ${rating},
          updated_at = ${now}
      `;

      return Response.json({ success: true, action: "rate", rating });
    } else {
      return new Response(
        "Invalid action. Must be 'watch', 'complete', 'rate', or 'progress'",
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error tracking engagement:", error);
    return Response.json(
      { error: "Failed to track engagement" },
      { status: 500 }
    );
  }
}
