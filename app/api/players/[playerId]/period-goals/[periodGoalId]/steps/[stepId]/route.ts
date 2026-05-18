import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { sql } from "@/db";

async function assertOwnsStep(
  req: NextRequest,
  playerId: string,
  periodGoalId: string,
  stepId: string,
) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const parentId = token?.sub;
  if (!parentId)
    return { ok: false as const, res: new Response("Unauthorized", { status: 401 }) };

  const rows = (await sql`
    SELECT s.id
    FROM player_goal_steps s
    JOIN player_period_goals g ON g.id = s.period_goal_id
    JOIN players p ON p.id = g.player_id
    WHERE s.id = ${stepId}
      AND s.period_goal_id = ${periodGoalId}
      AND g.player_id = ${playerId}
      AND p.parent_id = ${parentId}
    LIMIT 1
  `) as unknown as Array<{ id: string }>;

  if (rows.length === 0)
    return { ok: false as const, res: new Response("Not found", { status: 404 }) };
  return { ok: true as const };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; periodGoalId: string; stepId: string }> },
) {
  const { playerId, periodGoalId, stepId } = await ctx.params;
  const auth = await assertOwnsStep(req, playerId, periodGoalId, stepId);
  if (!auth.ok) return auth.res;

  const body = (await req.json().catch(() => null)) as { completed?: boolean } | null;
  if (typeof body?.completed !== "boolean")
    return new Response("completed (boolean) is required", { status: 400 });

  const { completed } = body;

  const rows = (await sql`
    UPDATE player_goal_steps
    SET
      completed    = ${completed},
      completed_at = ${completed ? sql`now()` : sql`NULL`}
    WHERE id = ${stepId}
    RETURNING
      id,
      period_goal_id,
      title,
      description,
      target_date::text AS target_date,
      completed,
      completed_at,
      sort_order
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

  return Response.json({ step: rows[0] });
}
