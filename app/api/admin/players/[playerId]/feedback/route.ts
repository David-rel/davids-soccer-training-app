import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";
import { generateParentFeedbackMarkdown } from "@/lib/feedbackCleaner";

type PlayerFeedbackRow = {
  id: string;
  player_id: string | null;
  title: string;
  raw_content: string;
  cleaned_markdown_content: string | null;
  public: boolean;
  created_at: string;
  updated_at: string;
};

async function buildFeedbackTitle(playerId: string) {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const rows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM player_feedback
    WHERE player_id = ${playerId}
      AND title LIKE ${`Feedback - ${datePart}%`}
  `) as unknown as Array<{ count: number }>;

  const nextNumber = (rows[0]?.count ?? 0) + 1;
  const suffix = String(nextNumber).padStart(2, "0");
  return `Feedback - ${datePart} - ${suffix}`;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const rows = (await sql`
    SELECT
      id,
      player_id,
      title,
      raw_content,
      cleaned_markdown_content,
      public,
      created_at,
      updated_at
    FROM player_feedback
    WHERE player_id = ${playerId}
    ORDER BY created_at DESC
    LIMIT 500
  `) as unknown as PlayerFeedbackRow[];

  return Response.json({ feedback: rows });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | {
        raw_content?: string;
        public?: boolean;
      }
    | null;

  const rawContent = String(body?.raw_content ?? "").trim();
  if (!rawContent) {
    return new Response("raw_content is required", { status: 400 });
  }

  const playerRows = (await sql`
    SELECT name
    FROM players
    WHERE id = ${playerId}
    LIMIT 1
  `) as unknown as Array<{ name: string }>;

  const player = playerRows[0];
  if (!player) return new Response("Player not found", { status: 404 });

  const title = await buildFeedbackTitle(playerId);

  let cleanedMarkdown = "";
  try {
    cleanedMarkdown = await generateParentFeedbackMarkdown({
      playerName: player.name,
      rawContent,
      title,
    });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Failed to generate cleaned feedback.";
    return new Response(msg, { status: 500 });
  }

  const isPublic = body?.public === undefined ? true : Boolean(body.public);

  const rows = (await sql`
    INSERT INTO player_feedback (
      player_id,
      title,
      raw_content,
      cleaned_markdown_content,
      public
    )
    VALUES (
      ${playerId},
      ${title},
      ${rawContent},
      ${cleanedMarkdown},
      ${isPublic}
    )
    RETURNING
      id,
      player_id,
      title,
      raw_content,
      cleaned_markdown_content,
      public,
      created_at,
      updated_at
  `) as unknown as PlayerFeedbackRow[];

  return Response.json({ feedback: rows[0] }, { status: 201 });
}
