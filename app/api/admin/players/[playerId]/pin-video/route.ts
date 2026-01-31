import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

async function assertIsAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const userId = token?.sub;
  if (!userId) {
    return { ok: false as const, res: new Response("Unauthorized", { status: 401 }) };
  }

  // Check if user has security code (is admin)
  const securityCode = req.headers.get("x-security-code");
  if (securityCode !== process.env.SECURITY_CODE) {
    return { ok: false as const, res: new Response("Forbidden", { status: 403 }) };
  }

  return { ok: true as const, userId };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertIsAdmin(req);
  if (!auth.ok) return auth.res;

  try {
    const body = await req.json();
    const { videoId, priority, note } = body;

    if (!videoId) {
      return Response.json({ error: "videoId is required" }, { status: 400 });
    }

    await sql`
      INSERT INTO coach_video_pins (player_id, video_id, pinned_by, priority, note)
      VALUES (${playerId}, ${videoId}, ${auth.userId}, ${priority || 1}, ${note || null})
      ON CONFLICT (player_id, video_id)
      DO UPDATE SET
        priority = ${priority || 1},
        note = ${note || null}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error pinning video:", error);
    return Response.json({ error: "Failed to pin video" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertIsAdmin(req);
  if (!auth.ok) return auth.res;

  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return Response.json({ error: "videoId is required" }, { status: 400 });
    }

    await sql`
      DELETE FROM coach_video_pins
      WHERE player_id = ${playerId} AND video_id = ${videoId}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error unpinning video:", error);
    return Response.json({ error: "Failed to unpin video" }, { status: 500 });
  }
}

// Get pinned videos for a player
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertIsAdmin(req);
  if (!auth.ok) return auth.res;

  try {
    const pins = await sql`
      SELECT
        cvp.id, cvp.priority, cvp.note, cvp.created_at,
        v.id as video_id, v.title, v.category, v.thumbnail_url
      FROM coach_video_pins cvp
      INNER JOIN videos v ON cvp.video_id = v.id
      WHERE cvp.player_id = ${playerId}
      ORDER BY cvp.priority DESC, cvp.created_at DESC
    `;

    return Response.json({ pins });
  } catch (error) {
    console.error("Error fetching pinned videos:", error);
    return Response.json({ error: "Failed to fetch pinned videos" }, { status: 500 });
  }
}
