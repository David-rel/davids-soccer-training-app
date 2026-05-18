import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; requestId: string }> }
) {
  const { playerId, requestId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const rows = (await sql`
    DELETE FROM player_call_requests
    WHERE id = ${requestId}
      AND player_id = ${playerId}
      AND status = 'pending'
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  if (rows.length === 0) {
    return new Response("Not found or not cancellable", { status: 404 });
  }

  return Response.json({ ok: true });
}
