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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; feedbackId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId, feedbackId } = await ctx.params;

  const rows = (await sql`
    SELECT pf.id, pf.player_id, pf.title, pf.raw_content, p.name AS player_name
    FROM player_feedback pf
    JOIN players p ON p.id = pf.player_id
    WHERE pf.id = ${feedbackId}
      AND pf.player_id = ${playerId}
    LIMIT 1
  `) as unknown as Array<{
    id: string;
    player_id: string | null;
    title: string;
    raw_content: string;
    player_name: string;
  }>;

  const feedback = rows[0];
  if (!feedback) return new Response("Feedback not found", { status: 404 });

  let cleanedMarkdown = "";
  try {
    cleanedMarkdown = await generateParentFeedbackMarkdown({
      playerName: feedback.player_name,
      rawContent: feedback.raw_content,
      title: feedback.title,
    });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Failed to regenerate feedback.";
    return new Response(msg, { status: 500 });
  }

  const updated = (await sql`
    UPDATE player_feedback
    SET cleaned_markdown_content = ${cleanedMarkdown}
    WHERE id = ${feedbackId}
      AND player_id = ${playerId}
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

  if (!updated[0]) return new Response("Feedback not found", { status: 404 });

  return Response.json({ feedback: updated[0] });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; feedbackId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId, feedbackId } = await ctx.params;

  const rows = (await sql`
    DELETE FROM player_feedback
    WHERE id = ${feedbackId}
      AND player_id = ${playerId}
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  if (!rows[0]) return new Response("Feedback not found", { status: 404 });

  return Response.json({ ok: true });
}
