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
};

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ challengeId: string; submissionId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { challengeId, submissionId } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const { status } = body as { status?: unknown };
  if (status !== "seen") {
    return new Response("status must be 'seen'", { status: 400 });
  }

  const rows = (await sql`
    UPDATE challenge_submissions
    SET status = 'seen', seen_at = now(), updated_at = now()
    WHERE id = ${submissionId} AND challenge_id = ${challengeId}
    RETURNING id, challenge_id, player_id, video_url, is_youtube, notes, public,
              status, seen_at, created_at, updated_at
  `) as unknown as SubmissionRow[];

  if (rows.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json({ submission: rows[0] });
}
