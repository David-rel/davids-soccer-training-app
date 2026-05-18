import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

type SubmissionRow = {
  id: string;
  challenge_id: string;
  player_id: string;
  video_url: string;
  is_youtube: boolean;
  notes: string | null;
  public: boolean;
  status: string;
  seen_at: string | null;
  created_at: string;
  updated_at: string;
  player_name: string;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ challengeId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { challengeId } = await ctx.params;

  const submissions = (await sql`
    SELECT
      cs.id, cs.challenge_id, cs.player_id, cs.video_url, cs.is_youtube,
      cs.notes, cs.public, cs.status, cs.seen_at, cs.created_at, cs.updated_at,
      p.name AS player_name
    FROM challenge_submissions cs
    INNER JOIN players p ON p.id = cs.player_id
    WHERE cs.challenge_id = ${challengeId}
    ORDER BY cs.created_at DESC
  `) as unknown as SubmissionRow[];

  return Response.json({ submissions });
}
