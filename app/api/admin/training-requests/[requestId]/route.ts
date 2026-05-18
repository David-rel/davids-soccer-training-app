import { NextRequest } from "next/server";
import { sql } from "@/db";
import { assertAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { requestId } = await ctx.params;

  const rows = (await sql`
    UPDATE training_requests
    SET status = 'seen', seen_at = now(), updated_at = now()
    WHERE id = ${requestId}
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  if (rows.length === 0) return new Response("Not found", { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { requestId } = await ctx.params;

  await sql`DELETE FROM training_requests WHERE id = ${requestId}`;
  return new Response(null, { status: 204 });
}
