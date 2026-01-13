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

export async function GET(req: NextRequest) {
  const err = assertAdmin(req);
  if (err) return err;

  const { searchParams } = new URL(req.url);
  const publishedFilter = searchParams.get("published");

  let rows: VideoRow[];

  if (publishedFilter === "true") {
    rows = (await sql`
      SELECT * FROM videos
      WHERE published = true
      ORDER BY created_at DESC
    `) as unknown as VideoRow[];
  } else if (publishedFilter === "false") {
    rows = (await sql`
      SELECT * FROM videos
      WHERE published = false
      ORDER BY created_at DESC
    `) as unknown as VideoRow[];
  } else {
    // Return all videos
    rows = (await sql`
      SELECT * FROM videos
      ORDER BY created_at DESC
    `) as unknown as VideoRow[];
  }

  return Response.json({ videos: rows });
}

export async function POST(req: NextRequest) {
  const err = assertAdmin(req);
  if (err) return err;

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string;
    video_url?: string;
    category?: string;
    published?: boolean;
  } | null;

  const title = String(body?.title ?? "").trim();
  if (!title) return new Response("title is required", { status: 400 });

  const videoUrl = String(body?.video_url ?? "").trim();
  if (!videoUrl) return new Response("video_url is required", { status: 400 });

  const description = body?.description?.trim() || null;
  const category = body?.category?.trim() || null;
  const published = body?.published ?? true;

  const rows = (await sql`
    INSERT INTO videos (
      title,
      description,
      video_url,
      category,
      published,
      source
    )
    VALUES (
      ${title},
      ${description},
      ${videoUrl},
      ${category},
      ${published},
      'coach'
    )
    RETURNING *
  `) as unknown as VideoRow[];

  return Response.json({ video: rows[0] }, { status: 201 });
}
