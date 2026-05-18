import { NextRequest } from "next/server";

import { sql } from "@/db";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

type PlayerFeedbackParentRow = {
  id: string;
  player_id: string | null;
  title: string;
  cleaned_markdown_content: string | null;
  created_at: string;
};

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
