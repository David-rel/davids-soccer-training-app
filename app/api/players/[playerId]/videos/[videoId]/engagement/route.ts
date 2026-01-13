import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { sql } from "@/db";

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
  } | null;

  if (!body || !body.action) {
    return new Response("Missing action parameter", { status: 400 });
  }

  const { action, rating } = body;
  const now = new Date().toISOString();

  try {
    // 3. Handle different engagement actions
    if (action === "watch") {
      // Mark video as watched, increment watch count
      await sql`
        INSERT INTO video_engagement (
          player_id, video_id, watched, watch_count,
          first_watched_at, last_watched_at
        )
        VALUES (
          ${playerId}, ${videoId}, true, 1, ${now}, ${now}
        )
        ON CONFLICT (player_id, video_id)
        DO UPDATE SET
          watched = true,
          watch_count = video_engagement.watch_count + 1,
          last_watched_at = ${now},
          first_watched_at = COALESCE(video_engagement.first_watched_at, ${now}),
          updated_at = ${now}
      `;

      return Response.json({ success: true, action: "watch" });
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
          player_id, video_id, rating, rated_at
        )
        VALUES (
          ${playerId}, ${videoId}, ${rating}, ${now}
        )
        ON CONFLICT (player_id, video_id)
        DO UPDATE SET
          rating = ${rating},
          rated_at = ${now},
          updated_at = ${now}
      `;

      return Response.json({ success: true, action: "rate", rating });
    } else {
      return new Response(
        "Invalid action. Must be 'watch', 'complete', or 'rate'",
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
