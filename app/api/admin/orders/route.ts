import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/adminAuth";
import { listAdminOrders } from "@/lib/points/service";

export async function GET(req: NextRequest) {
  const err = await assertAdmin(req);
  if (err) return err;

  try {
    const orders = await listAdminOrders();
    return Response.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load orders.";
    return new Response(message, { status: 500 });
  }
}
