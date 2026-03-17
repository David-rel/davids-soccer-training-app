import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createParentShopPurchase, PointsPurchaseError } from "@/lib/points/service";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const parentId = token?.sub;
  if (!parentId) return new Response("Unauthorized", { status: 401 });

  const { playerId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { itemId?: number } | null;
  const itemId = Number(body?.itemId);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return new Response("itemId must be a positive integer.", { status: 400 });
  }

  try {
    const purchase = await createParentShopPurchase({ parentId, playerId, itemId });
    return Response.json(purchase, { status: 201 });
  } catch (error) {
    if (error instanceof PointsPurchaseError) {
      return Response.json(
        {
          error: error.message,
          reason: error.reason,
        },
        {
          status: error.reason === "not_found" ? 404 : 400,
        },
      );
    }

    const message = error instanceof Error ? error.message : "Purchase failed.";
    return new Response(message, { status: 500 });
  }
}
