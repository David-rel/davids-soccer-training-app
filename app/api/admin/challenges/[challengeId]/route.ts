import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertAdmin } from "@/lib/adminAuth";

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
};

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ challengeId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { challengeId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  // Fetch existing first
  const existing = (await sql`
    SELECT id, title, description, video_url, is_youtube, active FROM challenges WHERE id = ${challengeId} LIMIT 1
  `) as unknown as ChallengeRow[];

  if (existing.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const current = existing[0];

  const {
    title = current.title,
    description,
    video_url = current.video_url,
    is_youtube,
    active,
  } = body as {
    title?: string;
    description?: string | null;
    video_url?: string;
    is_youtube?: boolean;
    active?: boolean;
  };

  const finalTitle = typeof title === "string" ? title.trim() || current.title : current.title;
  const finalVideoUrl = typeof video_url === "string" ? video_url.trim() || current.video_url : current.video_url;
  const finalDesc = description !== undefined
    ? (typeof description === "string" ? description.trim() || null : null)
    : current.description;
  const finalIsYoutube = typeof is_youtube === "boolean" ? is_youtube : current.is_youtube;
  const finalActive = typeof active === "boolean" ? active : current.active;

  const rows = (await sql`
    UPDATE challenges
    SET
      title = ${finalTitle},
      description = ${finalDesc},
      video_url = ${finalVideoUrl},
      is_youtube = ${finalIsYoutube},
      active = ${finalActive},
      updated_at = now()
    WHERE id = ${challengeId}
    RETURNING id, title, description, video_url, is_youtube, active, created_at, updated_at
  `) as unknown as ChallengeRow[];

  return Response.json({ challenge: rows[0] });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ challengeId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { challengeId } = await ctx.params;

  const rows = (await sql`
    DELETE FROM challenges
    WHERE id = ${challengeId}
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  if (rows.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json({ ok: true });
}
