import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getParentPointsState } from "@/lib/points/service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const parentId = token?.sub;
  if (!parentId) return new Response("Unauthorized", { status: 401 });

  const { playerId } = await ctx.params;

  try {
    const state = await getParentPointsState(parentId, playerId);
    return Response.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load points state.";
    return new Response(message, {
      status: message === "Not found" ? 404 : 500,
    });
  }
}
