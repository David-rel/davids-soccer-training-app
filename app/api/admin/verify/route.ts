import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const err = await assertAdmin(req);
  if (err) return err;
  return Response.json({ ok: true });
}
