import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/adminAuth";
import { getAdminShopItems } from "@/lib/points/service";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  try {
    const items = await getAdminShopItems(playerId);
    return Response.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load shop.";
    return new Response(message, {
      status: message === "Not found" ? 404 : 500,
    });
  }
}
