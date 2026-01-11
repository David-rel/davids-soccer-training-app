import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

type PlayerGoalRow = {
  id: string;
  player_id: string;
  name: string;
  due_date: string | null; // YYYY-MM-DD
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function parseOptionalDate(raw: unknown) {
  const s = raw === null || raw === undefined ? "" : String(raw).trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
    return { error: "due_date must be YYYY-MM-DD" } as const;
  return s;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; goalId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, goalId } = await ctx.params;

  const rows = (await sql`
    SELECT
      id,
      player_id,
      name,
      due_date::text AS due_date,
      completed,
      completed_at,
      created_at,
      updated_at
    FROM player_goals
    WHERE id = ${goalId} AND player_id = ${playerId}
    LIMIT 1
  `) as unknown as PlayerGoalRow[];

  const goal = rows[0];
  if (!goal) return new Response("Not found", { status: 404 });

  return Response.json({ goal });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; goalId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, goalId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as Partial<{
    name: string;
    due_date: string | null;
    completed: boolean;
  }> | null;

  const wantsName = body?.name !== undefined;
  const wantsDue = body?.due_date !== undefined;
  const wantsCompleted = body?.completed !== undefined;

  if (!wantsName && !wantsDue && !wantsCompleted) {
    return new Response("Nothing to update.", { status: 400 });
  }

  const name = wantsName ? String(body?.name ?? "").trim() : null;
  if (wantsName && !name)
    return new Response("name cannot be empty", { status: 400 });

  const dueDate = wantsDue ? parseOptionalDate(body?.due_date) : null;
  if (
    wantsDue &&
    typeof dueDate === "object" &&
    dueDate &&
    "error" in dueDate
  ) {
    return new Response(dueDate.error, { status: 400 });
  }

  const completed = wantsCompleted ? Boolean(body?.completed) : null;

  const rows = (await sql`
    UPDATE player_goals
    SET
      name = CASE WHEN ${wantsName} THEN ${name} ELSE name END,
      due_date = CASE WHEN ${wantsDue} THEN ${dueDate}::date ELSE due_date END,
      completed = CASE WHEN ${wantsCompleted} THEN ${completed} ELSE completed END,
      completed_at = CASE
        WHEN ${wantsCompleted} AND ${completed} THEN now()
        WHEN ${wantsCompleted} AND NOT ${completed} THEN NULL
        ELSE completed_at
      END
    WHERE id = ${goalId} AND player_id = ${playerId}
    RETURNING
      id,
      player_id,
      name,
      due_date::text AS due_date,
      completed,
      completed_at,
      created_at,
      updated_at
  `) as unknown as PlayerGoalRow[];

  const goal = rows[0];
  if (!goal) return new Response("Not found", { status: 404 });

  return Response.json({ goal });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; goalId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, goalId } = await ctx.params;

  const rows = (await sql`
    DELETE FROM player_goals
    WHERE id = ${goalId} AND player_id = ${playerId}
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  if (!rows[0]) return new Response("Not found", { status: 404 });

  return Response.json({ ok: true });
}
