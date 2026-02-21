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
  set_by: 'parent' | 'coach';
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
  ctx: { params: Promise<{ playerId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const rows = (await sql`
    SELECT
      id,
      player_id,
      name,
      due_date::text AS due_date,
      completed,
      completed_at,
      set_by,
      created_at,
      updated_at
    FROM player_goals
    WHERE player_id = ${playerId}
    ORDER BY completed ASC, due_date ASC NULLS LAST, created_at DESC
    LIMIT 500
  `) as unknown as PlayerGoalRow[];

  return Response.json({ goals: rows });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    due_date?: string | null;
  } | null;

  const name = String(body?.name ?? "").trim();
  if (!name) return new Response("name is required", { status: 400 });

  const dueDate = parseOptionalDate(body?.due_date);
  if (typeof dueDate === "object" && dueDate && "error" in dueDate) {
    return new Response(dueDate.error, { status: 400 });
  }

  const rows = (await sql`
    INSERT INTO player_goals (player_id, name, due_date, completed, completed_at, set_by)
    VALUES (
      ${playerId},
      ${name},
      ${dueDate}::date,
      false,
      NULL,
      'coach'
    )
    RETURNING
      id,
      player_id,
      name,
      due_date::text AS due_date,
      completed,
      completed_at,
      set_by,
      created_at,
      updated_at
  `) as unknown as PlayerGoalRow[];

  return Response.json({ goal: rows[0] }, { status: 201 });
}
