import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; periodGoalId: string; stepId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId, periodGoalId, stepId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string | null;
    target_date?: string | null;
    sort_order?: number;
    completed?: boolean;
  } | null;

  const title = String(body?.title ?? "").trim();
  if (!title) return new Response("title is required", { status: 400 });

  const description = body?.description ? String(body.description).trim() || null : null;

  const rawDate = String(body?.target_date ?? "").trim();
  const targetDate =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;

  const sortOrder = typeof body?.sort_order === "number" ? body.sort_order : 0;
  const completed = typeof body?.completed === "boolean" ? body.completed : undefined;

  const rows = (await sql`
    UPDATE player_goal_steps s
    SET
      title       = ${title},
      description = ${description},
      target_date = ${targetDate}::date,
      sort_order  = ${sortOrder},
      completed    = COALESCE(${completed ?? null}::boolean, completed),
      completed_at = CASE
        WHEN ${completed ?? null}::boolean IS TRUE THEN COALESCE(completed_at, now())
        WHEN ${completed ?? null}::boolean IS FALSE THEN NULL
        ELSE completed_at
      END
    FROM player_period_goals g
    WHERE s.id = ${stepId}
      AND s.period_goal_id = ${periodGoalId}
      AND g.id = s.period_goal_id
      AND g.player_id = ${playerId}
    RETURNING
      s.id,
      s.period_goal_id,
      s.title,
      s.description,
      s.target_date::text AS target_date,
      s.completed,
      s.completed_at,
      s.sort_order
  `) as unknown as Array<{
    id: string;
    period_goal_id: string;
    title: string;
    description: string | null;
    target_date: string | null;
    completed: boolean;
    completed_at: string | null;
    sort_order: number;
  }>;

  if (rows.length === 0) return new Response("Not found", { status: 404 });
  return Response.json({ step: rows[0] });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; periodGoalId: string; stepId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId, periodGoalId, stepId } = await ctx.params;

  await sql`
    DELETE FROM player_goal_steps s
    USING player_period_goals g
    WHERE s.id = ${stepId}
      AND s.period_goal_id = ${periodGoalId}
      AND g.id = s.period_goal_id
      AND g.player_id = ${playerId}
  `;

  return new Response(null, { status: 204 });
}
