import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; periodGoalId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId, periodGoalId } = await ctx.params;

  // Verify the period goal belongs to this player
  const goalCheck = (await sql`
    SELECT id FROM player_period_goals
    WHERE id = ${periodGoalId} AND player_id = ${playerId}
    LIMIT 1
  `) as unknown as Array<{ id: string }>;
  if (goalCheck.length === 0) return new Response("Not found", { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string | null;
    target_date?: string | null;
    sort_order?: number;
  } | null;

  const title = String(body?.title ?? "").trim();
  if (!title) return new Response("title is required", { status: 400 });

  const description = body?.description ? String(body.description).trim() || null : null;

  const rawDate = String(body?.target_date ?? "").trim();
  const targetDate =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;

  const sortOrder = typeof body?.sort_order === "number" ? body.sort_order : 0;

  const rows = (await sql`
    INSERT INTO player_goal_steps
      (period_goal_id, title, description, target_date, sort_order)
    VALUES
      (${periodGoalId}, ${title}, ${description}, ${targetDate}::date, ${sortOrder})
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

  return Response.json({ step: rows[0] }, { status: 201 });
}
