import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { sql } from "@/db";

type VideoRow = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  category: string | null;
  published: boolean;
  source: string;
  recommended_by_parent_id: string | null;
  created_at: string;
};

async function assertOwnsPlayer(req: NextRequest, playerId: string) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const parentId = token?.sub;
  if (!parentId)
    return {
      ok: false as const,
      res: new Response("Unauthorized", { status: 401 }),
    };

  const owns = (await sql`
    SELECT 1
    FROM players
    WHERE id = ${playerId} AND parent_id = ${parentId}
    LIMIT 1
  `) as unknown as Array<{ "?column?": number }>;

  if (owns.length === 0)
    return {
      ok: false as const,
      res: new Response("Not found", { status: 404 }),
    };
  return { ok: true as const, parentId };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const body = (await req.json().catch(() => null)) as {
    video_url?: string;
    title?: string;
    description?: string;
  } | null;

  const videoUrl = String(body?.video_url ?? "").trim();
  if (!videoUrl) return new Response("video_url is required", { status: 400 });

  const title = body?.title?.trim() || "Parent-Recommended Video";
  const description = body?.description?.trim() || null;

  // Check if parent has reached the limit of 5 unpublished recommendations
  const unpublishedCount = (await sql`
    SELECT COUNT(*) as count
    FROM videos
    WHERE recommended_by_parent_id = ${auth.parentId} AND published = false
  `) as unknown as Array<{ count: string }>;

  const count = parseInt(unpublishedCount[0].count, 10);
  if (count >= 5) {
    return new Response(
      "You have reached the maximum of 5 pending video recommendations. Please wait for the coach to review your previous suggestions.",
      { status: 400 }
    );
  }

  const rows = (await sql`
    INSERT INTO videos (
      title,
      description,
      video_url,
      published,
      source,
      recommended_by_parent_id
    )
    VALUES (
      ${title},
      ${description},
      ${videoUrl},
      false,
      'parent',
      ${auth.parentId}
    )
    RETURNING
      id,
      title,
      description,
      video_url,
      category,
      published,
      source,
      recommended_by_parent_id,
      created_at
  `) as unknown as VideoRow[];

  return Response.json(
    {
      video: rows[0],
      message: "Video submitted for coach review",
    },
    { status: 201 }
  );
}
