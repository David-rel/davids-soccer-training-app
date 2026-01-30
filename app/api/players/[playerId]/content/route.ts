import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";

async function assertOwnsPlayer(req: NextRequest, playerId: string) {
  const token = await getToken({ req });
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

type UploadRow = {
  id: string;
  player_id: string;
  video_url: string;
  description: string | null;
  status: string;
  upload_month: string;
  coach_video_response_url: string | null;
  coach_document_response_url: string | null;
  coach_response_description: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  // Get all uploads for this player
  const uploads = (await sql`
    SELECT
      id,
      player_id,
      video_url,
      description,
      status,
      upload_month::text,
      coach_video_response_url,
      coach_document_response_url,
      coach_response_description,
      created_at,
      updated_at
    FROM player_video_uploads
    WHERE player_id = ${playerId}
    ORDER BY created_at DESC
    LIMIT 100
  `) as unknown as UploadRow[];

  // Get current month upload count for limit display
  const now = new Date();
  const uploadMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const countRows = (await sql`
    SELECT COUNT(*) as count
    FROM player_video_uploads
    WHERE player_id = ${playerId} AND upload_month = ${uploadMonth}::date
  `) as unknown as Array<{ count: string }>;

  const currentMonthCount = parseInt(countRows[0].count, 10);

  // Calculate next reset date (1st of next month)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return Response.json({
    uploads,
    limit: {
      used: currentMonthCount,
      total: 4,
      remaining: Math.max(0, 4 - currentMonthCount),
      resetDate: nextMonth.toISOString().split("T")[0], // YYYY-MM-DD
    },
  });
}
