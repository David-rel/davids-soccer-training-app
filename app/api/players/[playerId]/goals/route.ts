import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

async function assertOwnsPlayer(req: NextRequest, playerId: string) {
  const token = await getToken({ req });
  const parentId = token?.sub;
  if (!parentId)
    return {
      ok: false as const,
      res: new Response("Unauthorized", { status: 401 }),
    };

  const owns = (await sql`
    SELECT 1
    FROM players
    WHERE id = ${playerId} AND parent_id = ${parentId}
    LIMIT 1
  `) as unknown as Array<{ "?column?": number }>;

  if (owns.length === 0)
    return {
      ok: false as const,
      res: new Response("Not found", { status: 404 }),
    };
  return { ok: true as const, parentId };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

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
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

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
    INSERT INTO player_goals (player_id, name, due_date, completed, completed_at)
    VALUES (
      ${playerId},
      ${name},
      ${dueDate}::date,
      false,
      NULL
    )
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

  return Response.json({ goal: rows[0] }, { status: 201 });
}
