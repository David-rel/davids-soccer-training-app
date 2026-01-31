import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  try {
    // Get pinned videos with full video details
    const pins = await sql`
      SELECT
        cvp.id, cvp.priority, cvp.note, cvp.created_at, cvp.video_id,
        v.id as video_id, v.title, v.description, v.video_url,
        v.category, v.thumbnail_url, v.duration, v.channel
      FROM coach_video_pins cvp
      INNER JOIN videos v ON cvp.video_id = v.id
      WHERE cvp.player_id = ${playerId}
        AND v.published = true
      ORDER BY cvp.priority DESC, cvp.created_at DESC
    `;

    // Transform to match expected structure with nested video object
    const formattedPins = pins.map((pin: any) => ({
      id: pin.id,
      priority: pin.priority,
      note: pin.note,
      created_at: pin.created_at,
      video_id: pin.video_id,
      video: {
        id: pin.video_id,
        title: pin.title,
        description: pin.description,
        video_url: pin.video_url,
        category: pin.category,
        thumbnail_url: pin.thumbnail_url,
        duration: pin.duration,
        channel: pin.channel,
      },
    }));

    return Response.json({ pins: formattedPins });
  } catch (error) {
    console.error("Error fetching pinned videos:", error);
    return Response.json(
      { error: "Failed to fetch pinned videos" },
      { status: 500 }
    );
  }
}
