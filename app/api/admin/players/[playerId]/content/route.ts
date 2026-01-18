import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

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
  ctx: { params: Promise<{ playerId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

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
    LIMIT 200
  `) as unknown as UploadRow[];

  return Response.json({ uploads });
}
