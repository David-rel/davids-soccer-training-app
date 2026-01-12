import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

type PlayerSessionRow = {
  id: string;
  player_id: string;
  session_date: string; // YYYY-MM-DD
  title: string;
  session_plan: string | null;
  focus_areas: string | null;
  activities: string | null;
  things_to_try: string | null;
  notes: string | null;
  admin_notes: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function parseRequiredDate(raw: unknown) {
  const s = raw === null || raw === undefined ? "" : String(raw).trim();
  if (!s) return { error: "session_date is required" } as const;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
    return { error: "session_date must be YYYY-MM-DD" } as const;
  return s;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const rows = (await sql`
    SELECT
      id,
      player_id,
      session_date::text AS session_date,
      title,
      session_plan,
      focus_areas,
      activities,
      things_to_try,
      notes,
      admin_notes,
      published,
      published_at,
      created_at,
      updated_at
    FROM player_sessions
    WHERE player_id = ${playerId}
    ORDER BY session_date DESC, created_at DESC
    LIMIT 500
  `) as unknown as PlayerSessionRow[];

  return Response.json({ sessions: rows });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as {
    session_date?: string;
    title?: string;
    session_plan?: string | null;
    focus_areas?: string | null;
    activities?: string | null;
    things_to_try?: string | null;
    notes?: string | null;
    admin_notes?: string | null;
  } | null;

  const title = String(body?.title ?? "").trim();
  if (!title) return new Response("title is required", { status: 400 });

  const sessionDate = parseRequiredDate(body?.session_date);
  if (typeof sessionDate === "object" && sessionDate && "error" in sessionDate) {
    return new Response(sessionDate.error, { status: 400 });
  }

  const sessionPlan = body?.session_plan?.trim() || null;
  const focusAreas = body?.focus_areas?.trim() || null;
  const activities = body?.activities?.trim() || null;
  const thingsToTry = body?.things_to_try?.trim() || null;
  const notes = body?.notes?.trim() || null;
  const adminNotes = body?.admin_notes?.trim() || null;

  const rows = (await sql`
    INSERT INTO player_sessions (
      player_id,
      session_date,
      title,
      session_plan,
      focus_areas,
      activities,
      things_to_try,
      notes,
      admin_notes,
      published,
      published_at
    )
    VALUES (
      ${playerId},
      ${sessionDate}::date,
      ${title},
      ${sessionPlan},
      ${focusAreas},
      ${activities},
      ${thingsToTry},
      ${notes},
      ${adminNotes},
      false,
      NULL
    )
    RETURNING
      id,
      player_id,
      session_date::text AS session_date,
      title,
      session_plan,
      focus_areas,
      activities,
      things_to_try,
      notes,
      admin_notes,
      published,
      published_at,
      created_at,
      updated_at
  `) as unknown as PlayerSessionRow[];

  return Response.json({ session: rows[0] }, { status: 201 });
}
