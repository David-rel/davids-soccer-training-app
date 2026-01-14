import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

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
