import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

type VideoRow = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  category: string | null;
  thumbnail_url: string | null;
  duration: string | null;
  channel: string | null;
  published: boolean;
  source: string;
  recommended_by_parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ videoId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { videoId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string;
    video_url?: string;
    category?: string;
    published?: boolean;
  } | null;

  if (!body || Object.keys(body).length === 0) {
    return new Response("No fields to update", { status: 400 });
  }

  // Validate and prepare update values
  let title: string | undefined;
  let description: string | null | undefined;
  let videoUrl: string | undefined;
  let category: string | null | undefined;
  let published: boolean | undefined;

  if (body.title !== undefined) {
    title = String(body.title).trim();
    if (!title) return new Response("title cannot be empty", { status: 400 });
  }

  if (body.description !== undefined) {
    description = body.description?.trim() || null;
  }

  if (body.video_url !== undefined) {
    videoUrl = String(body.video_url).trim();
    if (!videoUrl)
      return new Response("video_url cannot be empty", { status: 400 });
  }

  if (body.category !== undefined) {
    category = body.category?.trim() || null;
  }

  if (body.published !== undefined) {
    published = body.published;
  }

  // Build sets array based on what fields are being updated
  const setClauses: string[] = [];
  if (title !== undefined) setClauses.push("title");
  if (description !== undefined) setClauses.push("description");
  if (videoUrl !== undefined) setClauses.push("video_url");
  if (category !== undefined) setClauses.push("category");
  if (published !== undefined) setClauses.push("published");

  // Execute different queries based on what's being updated
  let rows: VideoRow[];

  if (setClauses.length === 0) {
    return new Response("No valid fields to update", { status: 400 });
  }

  // For simplicity, always update all fields that were provided
  if (title !== undefined && description !== undefined && videoUrl !== undefined && category !== undefined && published !== undefined) {
    rows = (await sql`
      UPDATE videos SET title = ${title}, description = ${description}, video_url = ${videoUrl},
        category = ${category}, published = ${published}, updated_at = now()
      WHERE id = ${videoId} RETURNING *
    `) as unknown as VideoRow[];
  } else if (title !== undefined) {
    rows = (await sql`
      UPDATE videos SET title = ${title}, updated_at = now() WHERE id = ${videoId} RETURNING *
    `) as unknown as VideoRow[];
  } else if (description !== undefined) {
    rows = (await sql`
      UPDATE videos SET description = ${description}, updated_at = now() WHERE id = ${videoId} RETURNING *
    `) as unknown as VideoRow[];
  } else if (videoUrl !== undefined) {
    rows = (await sql`
      UPDATE videos SET video_url = ${videoUrl}, updated_at = now() WHERE id = ${videoId} RETURNING *
    `) as unknown as VideoRow[];
  } else if (category !== undefined) {
    rows = (await sql`
      UPDATE videos SET category = ${category}, updated_at = now() WHERE id = ${videoId} RETURNING *
    `) as unknown as VideoRow[];
  } else if (published !== undefined) {
    rows = (await sql`
      UPDATE videos SET published = ${published}, updated_at = now() WHERE id = ${videoId} RETURNING *
    `) as unknown as VideoRow[];
  } else {
    // Multiple fields combination - fetch existing and update all provided fields
    rows = (await sql`
      UPDATE videos SET
        title = CASE WHEN ${title !== undefined} THEN ${title ?? ""} ELSE title END,
        description = CASE WHEN ${description !== undefined} THEN ${description ?? null} ELSE description END,
        video_url = CASE WHEN ${videoUrl !== undefined} THEN ${videoUrl ?? ""} ELSE video_url END,
        category = CASE WHEN ${category !== undefined} THEN ${category ?? null} ELSE category END,
        published = CASE WHEN ${published !== undefined} THEN ${published ?? false} ELSE published END,
        updated_at = now()
      WHERE id = ${videoId}
      RETURNING *
    `) as unknown as VideoRow[];
  }

  if (rows.length === 0) {
    return new Response("Video not found", { status: 404 });
  }

  return Response.json({ video: rows[0] });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ videoId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { videoId } = await ctx.params;

  const rows = (await sql`
    DELETE FROM videos
    WHERE id = ${videoId}
    RETURNING id
  `) as unknown as { id: string }[];

  if (rows.length === 0) {
    return new Response("Video not found", { status: 404 });
  }

  return Response.json({ success: true });
}
