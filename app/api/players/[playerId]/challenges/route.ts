import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  is_youtube: boolean;
  active: boolean;
  created_at: string;
  submission_id: string | null;
  submission_video_url: string | null;
  submission_is_youtube: boolean | null;
  submission_notes: string | null;
  submission_public: boolean | null;
  submission_status: string | null;
  submission_seen_at: string | null;
  submission_created_at: string | null;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const rows = (await sql`
    SELECT
      c.id, c.title, c.description, c.video_url, c.is_youtube, c.active, c.created_at,
      cs.id AS submission_id,
      cs.video_url AS submission_video_url,
      cs.is_youtube AS submission_is_youtube,
      cs.notes AS submission_notes,
      cs.public AS submission_public,
      cs.status AS submission_status,
      cs.seen_at AS submission_seen_at,
      cs.created_at AS submission_created_at
    FROM challenges c
    LEFT JOIN challenge_submissions cs
      ON cs.challenge_id = c.id AND cs.player_id = ${playerId}
    WHERE c.active = true
      AND EXISTS (
        SELECT 1 FROM player_sessions
        WHERE player_id = ${playerId} AND published = true
      )
    ORDER BY c.created_at DESC
  `) as unknown as ChallengeRow[];

  const challenges = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    video_url: r.video_url,
    is_youtube: r.is_youtube,
    active: r.active,
    created_at: r.created_at,
    my_submission: r.submission_id
      ? {
          id: r.submission_id,
          video_url: r.submission_video_url,
          is_youtube: r.submission_is_youtube,
          notes: r.submission_notes,
          public: r.submission_public,
          status: r.submission_status,
          seen_at: r.submission_seen_at,
          created_at: r.submission_created_at,
        }
      : null,
  }));

  return Response.json({ challenges });
}
