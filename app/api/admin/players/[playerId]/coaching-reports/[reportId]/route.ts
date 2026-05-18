import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; reportId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;
  const { playerId, reportId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    report_date?: string;
    content?: Record<string, unknown>;
  } | null;

  const title = String(body?.title ?? "").trim();
  if (!title) return new Response("title is required", { status: 400 });

  const reportDate = body?.report_date && /^\d{4}-\d{2}-\d{2}$/.test(body.report_date)
    ? body.report_date
    : undefined;

  const content = body?.content && typeof body.content === "object" ? body.content : undefined;

  const rows = (await sql`
    UPDATE player_coaching_reports
    SET
      title       = ${title},
      report_date = COALESCE(${reportDate ?? null}::date, report_date),
      content     = COALESCE(${content ? JSON.stringify(content) : null}::jsonb, content)
    WHERE id = ${reportId} AND player_id = ${playerId}
    RETURNING id, player_id, type, title, report_date::text AS report_date, content, created_at, updated_at
  `) as unknown as unknown[];

  if (!(rows as unknown[]).length) return new Response("Not found", { status: 404 });
  return Response.json({ report: (rows as Record<string, unknown>[])[0] });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; reportId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;
  const { playerId, reportId } = await ctx.params;

  await sql`DELETE FROM player_coaching_reports WHERE id = ${reportId} AND player_id = ${playerId}`;
  return new Response(null, { status: 204 });
}
