import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; videoId: string }> }
) {
  const { playerId, videoId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  try {
    const body = await req.json();
    const { reason, description } = body;

    if (!reason || typeof reason !== "string") {
      return Response.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    const validReasons = ["inappropriate", "broken_link", "incorrect_category", "other"];
    if (!validReasons.includes(reason)) {
      return Response.json(
        { error: "Invalid reason" },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO video_reports (video_id, player_id, reason, description)
      VALUES (${videoId}, ${playerId}, ${reason}, ${description || null})
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error reporting video:", error);
    return Response.json(
      { error: "Failed to report video" },
      { status: 500 }
    );
  }
}
