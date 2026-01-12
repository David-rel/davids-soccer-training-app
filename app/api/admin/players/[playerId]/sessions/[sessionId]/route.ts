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

function parseOptionalDate(raw: unknown) {
  const s = raw === null || raw === undefined ? "" : String(raw).trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
    return { error: "session_date must be YYYY-MM-DD" } as const;
  return s;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; sessionId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, sessionId } = await ctx.params;

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
    WHERE id = ${sessionId} AND player_id = ${playerId}
    LIMIT 1
  `) as unknown as PlayerSessionRow[];

  const session = rows[0];
  if (!session) return new Response("Not found", { status: 404 });

  return Response.json({ session });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; sessionId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, sessionId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as Partial<{
    session_date: string;
    title: string;
    session_plan: string | null;
    focus_areas: string | null;
    activities: string | null;
    things_to_try: string | null;
    notes: string | null;
    admin_notes: string | null;
    published: boolean;
  }> | null;

  const wantsDate = body?.session_date !== undefined;
  const wantsTitle = body?.title !== undefined;
  const wantsPlan = body?.session_plan !== undefined;
  const wantsFocus = body?.focus_areas !== undefined;
  const wantsActivities = body?.activities !== undefined;
  const wantsThingsToTry = body?.things_to_try !== undefined;
  const wantsNotes = body?.notes !== undefined;
  const wantsAdminNotes = body?.admin_notes !== undefined;
  const wantsPublished = body?.published !== undefined;

  if (
    !wantsDate &&
    !wantsTitle &&
    !wantsPlan &&
    !wantsFocus &&
    !wantsActivities &&
    !wantsThingsToTry &&
    !wantsNotes &&
    !wantsAdminNotes &&
    !wantsPublished
  ) {
    return new Response("Nothing to update.", { status: 400 });
  }

  const title = wantsTitle ? String(body?.title ?? "").trim() : null;
  if (wantsTitle && !title)
    return new Response("title cannot be empty", { status: 400 });

  const sessionDate = wantsDate ? parseOptionalDate(body?.session_date) : null;
  if (
    wantsDate &&
    typeof sessionDate === "object" &&
    sessionDate &&
    "error" in sessionDate
  ) {
    return new Response(sessionDate.error, { status: 400 });
  }

  const sessionPlan = wantsPlan ? (body?.session_plan?.trim() || null) : null;
  const focusAreas = wantsFocus ? (body?.focus_areas?.trim() || null) : null;
  const activities = wantsActivities
    ? (body?.activities?.trim() || null)
    : null;
  const thingsToTry = wantsThingsToTry
    ? (body?.things_to_try?.trim() || null)
    : null;
  const notes = wantsNotes ? (body?.notes?.trim() || null) : null;
  const adminNotes = wantsAdminNotes
    ? (body?.admin_notes?.trim() || null)
    : null;
  const published = wantsPublished ? Boolean(body?.published) : null;

  const rows = (await sql`
    UPDATE player_sessions
    SET
      session_date = CASE WHEN ${wantsDate} THEN ${sessionDate}::date ELSE session_date END,
      title = CASE WHEN ${wantsTitle} THEN ${title} ELSE title END,
      session_plan = CASE WHEN ${wantsPlan} THEN ${sessionPlan} ELSE session_plan END,
      focus_areas = CASE WHEN ${wantsFocus} THEN ${focusAreas} ELSE focus_areas END,
      activities = CASE WHEN ${wantsActivities} THEN ${activities} ELSE activities END,
      things_to_try = CASE WHEN ${wantsThingsToTry} THEN ${thingsToTry} ELSE things_to_try END,
      notes = CASE WHEN ${wantsNotes} THEN ${notes} ELSE notes END,
      admin_notes = CASE WHEN ${wantsAdminNotes} THEN ${adminNotes} ELSE admin_notes END,
      published = CASE WHEN ${wantsPublished} THEN ${published} ELSE published END,
      published_at = CASE
        WHEN ${wantsPublished} AND ${published} THEN COALESCE(published_at, now())
        WHEN ${wantsPublished} AND NOT ${published} THEN NULL
        ELSE published_at
      END
    WHERE id = ${sessionId} AND player_id = ${playerId}
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

  const session = rows[0];
  if (!session) return new Response("Not found", { status: 404 });

  return Response.json({ session });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; sessionId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, sessionId } = await ctx.params;

  const rows = (await sql`
    DELETE FROM player_sessions
    WHERE id = ${sessionId} AND player_id = ${playerId}
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  if (!rows[0]) return new Response("Not found", { status: 404 });

  return Response.json({ ok: true });
}
