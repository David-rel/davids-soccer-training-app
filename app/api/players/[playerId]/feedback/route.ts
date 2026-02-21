import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { sql } from "@/db";

type PlayerFeedbackParentRow = {
  id: string;
  player_id: string | null;
  title: string;
  cleaned_markdown_content: string | null;
  created_at: string;
};

async function assertOwnsPlayer(req: NextRequest, playerId: string) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });
  const parentId = token?.sub;
  if (!parentId) {
    return {
      ok: false as const,
      res: new Response("Unauthorized", { status: 401 }),
    };
  }

  const owns = (await sql`
    SELECT 1
    FROM players
    WHERE id = ${playerId} AND parent_id = ${parentId}
    LIMIT 1
  `) as unknown as Array<{ "?column?": number }>;

  if (owns.length === 0) {
    return {
      ok: false as const,
      res: new Response("Not found", { status: 404 }),
    };
  }

  return { ok: true as const, parentId };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const { playerId } = await ctx.params;

  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const rows = (await sql`
    SELECT
      id,
      player_id,
      title,
      cleaned_markdown_content,
      created_at
    FROM player_feedback
    WHERE player_id = ${playerId}
      AND public = true
    ORDER BY created_at DESC
    LIMIT 500
  `) as unknown as PlayerFeedbackParentRow[];

  return Response.json({ feedback: rows });
}
