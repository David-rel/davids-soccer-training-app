import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PinnedVideoRow = {
  id: string;
  priority: number;
  note: string | null;
  created_at: string;
  video_id: string;
  title: string;
  description: string | null;
  video_url: string;
  category: string | null;
  thumbnail_url: string | null;
  duration: string | null;
  channel: string | null;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  try {
    // Get pinned videos with full video details
    const pins = (await sql`
      SELECT
        cvp.id, cvp.priority, cvp.note, cvp.created_at, cvp.video_id,
        v.id as video_id, v.title, v.description, v.video_url,
        v.category, v.thumbnail_url, v.duration, v.channel
      FROM coach_video_pins cvp
      INNER JOIN videos v ON cvp.video_id = v.id
      WHERE cvp.player_id = ${playerId}
        AND v.published = true
      ORDER BY cvp.priority DESC, cvp.created_at DESC
    `) as unknown as PinnedVideoRow[];

    // Transform to match expected structure with nested video object
    const formattedPins = pins.map((pin) => ({
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
