import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { sql } from "@/db";
import {
  computeRecommendations,
  type VideoRow,
  type VideoEngagementRow,
} from "@/lib/videoRecommendations";
import type { PlayerProfileData } from "@/lib/computePlayerProfile";

export const dynamic = "force-dynamic";
export const revalidate = 0; // No caching - always fresh

type PlayerProfileRow = {
  id: string;
  data: PlayerProfileData;
  computed_at: string;
};

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
  ctx: { params: Promise<{ playerId: string }> },
) {
  const startTime = Date.now();

  // 1. Authentication & Authorization
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  try {
    // 2. Fetch data in parallel for performance
    const [videos, profiles, engagements, pinnedVideos] = await Promise.all([
      // Get all published videos
      sql`
        SELECT id, title, description, video_url, category,
               thumbnail_url, duration, channel, created_at
        FROM videos
        WHERE published = true
        ORDER BY created_at DESC
      ` as unknown as Promise<VideoRow[]>,

      // Get latest player profile (contains all computed metrics)
      sql`
        SELECT id, data, computed_at
        FROM player_profiles
        WHERE player_id = ${playerId}
        ORDER BY computed_at DESC
        LIMIT 1
      ` as unknown as Promise<PlayerProfileRow[]>,

      // Get all engagement records for this player
      sql`
        SELECT video_id, watched, completed, rating_stars as rating,
               watch_count, last_watched_at
        FROM video_engagement
        WHERE player_id = ${playerId}
      ` as unknown as Promise<VideoEngagementRow[]>,

      // Get coach-pinned videos
      sql`
        SELECT cvp.video_id, cvp.priority, cvp.note
        FROM coach_video_pins cvp
        WHERE cvp.player_id = ${playerId}
        ORDER BY cvp.priority DESC
      ` as unknown as Promise<
        Array<{ video_id: string; priority: number; note: string | null }>
      >,
    ]);

    // 3. Compute recommendations using core algorithm
    let recommendations = computeRecommendations({
      videos,
      playerProfile: profiles[0]?.data || null,
      engagements,
      options: {
        testWeight: 0.7, // 70% test alignment
        engagementWeight: 0.3, // 30% engagement score
        maxResults: undefined, // Return all, client handles pagination
      },
    });

    // 4. Move coach-pinned videos to the top (preserving their priority order)
    if (pinnedVideos.length > 0) {
      const pinnedVideoIds = new Set(pinnedVideos.map((p) => p.video_id));
      const pinned = recommendations.filter((r) =>
        pinnedVideoIds.has(r.video.id),
      );
      const notPinned = recommendations.filter(
        (r) => !pinnedVideoIds.has(r.video.id),
      );

      // Sort pinned by coach's priority
      pinned.sort((a, b) => {
        const priorityA =
          pinnedVideos.find((p) => p.video_id === a.video.id)?.priority || 0;
        const priorityB =
          pinnedVideos.find((p) => p.video_id === b.video.id)?.priority || 0;
        return priorityB - priorityA;
      });

      // Add "Coach Recommended" reason to pinned videos
      pinned.forEach((p) => {
        const pin = pinnedVideos.find((pv) => pv.video_id === p.video.id);
        p.reason = pin?.note || "Coach Recommended";
      });

      recommendations = [...pinned, ...notPinned];

      // Re-assign ranks
      recommendations.forEach((r, index) => {
        r.rank = index + 1;
      });
    }

    const computeTime = Date.now() - startTime;

    // 5. Return ranked recommendations with metadata
    return Response.json({
      recommendations,
      metadata: {
        total_videos: videos.length,
        has_profile: !!profiles[0],
        profile_computed_at: profiles[0]?.computed_at || null,
        engagement_count: engagements.length,
        pinned_count: pinnedVideos.length,
        compute_time_ms: computeTime,
      },
    });
  } catch (error) {
    console.error("Error computing recommendations:", error);
    return Response.json(
      { error: "Failed to compute recommendations" },
      { status: 500 },
    );
  }
}
