import { NextRequest } from "next/server";
import { sql } from "@/db";
import { sendSmsViaTwilio } from "@/lib/twilio";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

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

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; challengeId: string }> }
) {
  const { playerId, challengeId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const { video_url, is_youtube, notes, public: isPublic } = body as {
    video_url?: unknown;
    is_youtube?: unknown;
    notes?: unknown;
    public?: unknown;
  };

  if (!video_url || typeof video_url !== "string" || !video_url.trim()) {
    return new Response("video_url is required", { status: 400 });
  }

  const rows = (await sql`
    INSERT INTO challenge_submissions (
      challenge_id, player_id, video_url, is_youtube, notes, public
    )
    VALUES (
      ${challengeId},
      ${playerId},
      ${(video_url as string).trim()},
      ${is_youtube === true},
      ${notes && typeof notes === "string" ? notes.trim() || null : null},
      ${isPublic === true}
    )
    ON CONFLICT (challenge_id, player_id) DO UPDATE SET
      video_url = EXCLUDED.video_url,
      is_youtube = EXCLUDED.is_youtube,
      notes = EXCLUDED.notes,
      public = EXCLUDED.public,
      updated_at = now()
    RETURNING id, challenge_id, player_id, video_url, is_youtube, notes, public,
              status, seen_at, created_at, updated_at
  `) as unknown as SubmissionRow[];

  const submission = rows[0];

  // Fire-and-forget SMS to coach
  Promise.resolve().then(async () => {
    try {
      const infoRows = (await sql`
        SELECT p.name AS player_name, c.title AS challenge_title
        FROM players p
        CROSS JOIN challenges c
        WHERE p.id = ${playerId} AND c.id = ${challengeId}
        LIMIT 1
      `) as unknown as Array<{ player_name: string; challenge_title: string }>;

      if (infoRows.length > 0) {
        const { player_name, challenge_title } = infoRows[0];
        await sendSmsViaTwilio(
          `🏆 ${player_name} submitted a challenge response for '${challenge_title}'. Check admin.`,
          { to: "+17206122979" }
        ).catch(() => {});
      }
    } catch {
      // ignore
    }
  }).catch(() => {});

  return Response.json({ submission }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; challengeId: string }> }
) {
  const { playerId, challengeId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const { public: isPublic, notes } = body as {
    public?: unknown;
    notes?: unknown;
  };

  const rows = (await sql`
    UPDATE challenge_submissions
    SET
      public = ${isPublic === true},
      notes = ${notes && typeof notes === "string" ? notes.trim() || null : null},
      updated_at = now()
    WHERE challenge_id = ${challengeId} AND player_id = ${playerId}
    RETURNING id, challenge_id, player_id, video_url, is_youtube, notes, public,
              status, seen_at, created_at, updated_at
  `) as unknown as SubmissionRow[];

  if (rows.length === 0) {
    return new Response("Submission not found", { status: 404 });
  }

  return Response.json({ submission: rows[0] });
}
