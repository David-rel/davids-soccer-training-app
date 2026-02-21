import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; uploadId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId, uploadId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as {
    coach_video_response_url?: string | null;
    coach_document_response_url?: string | null;
    coach_response_description?: string | null;
  } | null;

  const videoUrl = body?.coach_video_response_url?.trim() || null;
  const documentUrl = body?.coach_document_response_url?.trim() || null;
  const description = body?.coach_response_description?.trim() || null;

  // At least one response field must be provided
  if (!videoUrl && !documentUrl && !description) {
    return new Response(
      "At least one response (video, document, or description) is required",
      { status: 400 }
    );
  }

  // Verify upload exists and belongs to this player
  const checkRows = (await sql`
    SELECT id FROM player_video_uploads
    WHERE id = ${uploadId} AND player_id = ${playerId}
    LIMIT 1
  `) as unknown as Array<{ id: string }>;

  if (checkRows.length === 0) {
    return new Response("Upload not found", { status: 404 });
  }

  // Update with coach response and mark as reviewed
  const rows = (await sql`
    UPDATE player_video_uploads
    SET
      coach_video_response_url = ${videoUrl},
      coach_document_response_url = ${documentUrl},
      coach_response_description = ${description},
      status = 'reviewed'
    WHERE id = ${uploadId} AND player_id = ${playerId}
    RETURNING
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
  `) as unknown as Array<{
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
  }>;

  return Response.json({
    upload: rows[0],
    message: "Review submitted successfully",
  });
}
