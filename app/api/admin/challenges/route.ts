import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertAdmin } from "@/lib/adminAuth";
import { sendSmsViaTwilio } from "@/lib/twilio";

export const dynamic = "force-dynamic";

type ChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  is_youtube: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  submission_count: string;
};

export async function GET(req: NextRequest) {
  const err = await assertAdmin(req);
  if (err) return err;

  const rows = (await sql`
    SELECT
      c.id, c.title, c.description, c.video_url, c.is_youtube, c.active,
      c.created_at, c.updated_at,
      COUNT(cs.id) AS submission_count
    FROM challenges c
    LEFT JOIN challenge_submissions cs ON cs.challenge_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `) as unknown as ChallengeRow[];

  const challenges = rows.map((r) => ({
    ...r,
    submission_count: parseInt(r.submission_count, 10),
  }));

  return Response.json({ challenges });
}

export async function POST(req: NextRequest) {
  const err = await assertAdmin(req);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const { title, description, video_url, is_youtube } = body as {
    title?: unknown;
    description?: unknown;
    video_url?: unknown;
    is_youtube?: unknown;
  };

  if (!title || typeof title !== "string" || !title.trim()) {
    return new Response("title is required", { status: 400 });
  }
  if (!video_url || typeof video_url !== "string" || !video_url.trim()) {
    return new Response("video_url is required", { status: 400 });
  }

  const rows = (await sql`
    INSERT INTO challenges (title, description, video_url, is_youtube)
    VALUES (
      ${(title as string).trim()},
      ${description && typeof description === "string" ? description.trim() || null : null},
      ${(video_url as string).trim()},
      ${is_youtube === true}
    )
    RETURNING id, title, description, video_url, is_youtube, active, created_at, updated_at
  `) as unknown as Omit<ChallengeRow, "submission_count">[];

  const challenge = rows[0];
  const challengeTitle = (title as string).trim();
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  // Fire SMS to all players who have at least one published session
  Promise.resolve()
    .then(async () => {
      const contacts = (await sql`
        SELECT DISTINCT pa.phone, pl.id AS player_id, pl.name AS player_name
        FROM players pl
        JOIN parents pa ON pa.id = pl.parent_id
        JOIN crm_parents cp ON cp.id = pa.crm_parent_id
        WHERE pa.phone IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM crm_sessions cs
            WHERE cs.parent_id = cp.id
              AND cs.cancelled = false
              AND cs.session_date >= (CURRENT_TIMESTAMP - INTERVAL '30 days')
          )
      `) as unknown as Array<{ phone: string; player_id: string; player_name: string }>;

      await Promise.allSettled(
        contacts.map((c) =>
          sendSmsViaTwilio(
            `Hi! Because ${c.player_name} trained with Coach David in the last 30 days, he's posted a new challenge just for them: "${challengeTitle}". Check it out: ${appUrl}/player/${c.player_id}/uploads`,
            { to: c.phone }
          )
        )
      );
    })
    .catch(() => {});

  return Response.json({ challenge }, { status: 201 });
}
