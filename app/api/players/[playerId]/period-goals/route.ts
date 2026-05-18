import { NextRequest } from "next/server";

import { sql } from "@/db";
import { assertOwnsPlayer } from "@/lib/assertOwnsPlayer";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const goalRows = (await sql`
    SELECT
      id,
      player_id,
      title,
      description,
      start_date::text AS start_date,
      end_date::text   AS end_date,
      created_at,
      updated_at
    FROM player_period_goals
    WHERE player_id = ${playerId}
    ORDER BY start_date DESC
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

  const stepRows = (await sql`
    SELECT
      s.id,
      s.period_goal_id,
      s.title,
      s.description,
      s.target_date::text AS target_date,
      s.completed,
      s.completed_at,
      s.sort_order
    FROM player_goal_steps s
    JOIN player_period_goals g ON g.id = s.period_goal_id
    WHERE g.player_id = ${playerId}
    ORDER BY s.sort_order ASC, s.created_at ASC
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

  const stepsByGoal = new Map<string, typeof stepRows>();
  for (const step of stepRows) {
    const list = stepsByGoal.get(step.period_goal_id) ?? [];
    list.push(step);
    stepsByGoal.set(step.period_goal_id, list);
  }

  const goals = goalRows.map((g) => ({
    ...g,
    steps: stepsByGoal.get(g.id) ?? [],
  }));

  return Response.json({ goals });
}
