import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

function parseDate(raw: unknown): string | { error: string } {
  const s = String(raw ?? "").trim();
  if (!s) return { error: "date is required" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { error: "date must be YYYY-MM-DD" };
  return s;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; periodGoalId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId, periodGoalId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string | null;
    start_date?: string;
    end_date?: string;
  } | null;

  const title = String(body?.title ?? "").trim();
  if (!title) return new Response("title is required", { status: 400 });

  const startDate = parseDate(body?.start_date);
  if (typeof startDate === "object") return new Response(startDate.error, { status: 400 });

  const endDate = parseDate(body?.end_date);
  if (typeof endDate === "object") return new Response(endDate.error, { status: 400 });

  const description = body?.description ? String(body.description).trim() || null : null;

  const rows = (await sql`
    UPDATE player_period_goals
    SET
      title       = ${title},
      description = ${description},
      start_date  = ${startDate}::date,
      end_date    = ${endDate}::date
    WHERE id = ${periodGoalId} AND player_id = ${playerId}
    RETURNING
      id,
      player_id,
      title,
      description,
      start_date::text AS start_date,
      end_date::text   AS end_date,
      created_at,
      updated_at
  `) as unknown as Array<{
    id: string;
    player_id: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
  }>;

  if (rows.length === 0) return new Response("Not found", { status: 404 });
  return Response.json({ goal: rows[0] });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; periodGoalId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId, periodGoalId } = await ctx.params;

  await sql`
    DELETE FROM player_period_goals
    WHERE id = ${periodGoalId} AND player_id = ${playerId}
  `;

  return new Response(null, { status: 204 });
}
