import { NextRequest } from "next/server";

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
  created_at: string;
  updated_at: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  let rows: VideoRow[];

  if (category) {
    rows = (await sql`
      SELECT
        id,
        title,
        description,
        video_url,
        category,
        thumbnail_url,
        duration,
        channel,
        published,
        source,
        created_at,
        updated_at
      FROM videos
      WHERE published = true AND category = ${category}
      ORDER BY created_at DESC
    `) as unknown as VideoRow[];
  } else {
    rows = (await sql`
      SELECT
        id,
        title,
        description,
        video_url,
        category,
        thumbnail_url,
        duration,
        channel,
        published,
        source,
        created_at,
        updated_at
      FROM videos
      WHERE published = true
      ORDER BY created_at DESC
    `) as unknown as VideoRow[];
  }

  return Response.json({ videos: rows });
}
