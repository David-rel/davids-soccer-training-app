import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

type PlayerRow = {
  id: string;
  parent_id: string;
  crm_player_id: number | null;
  name: string;
  age: number | null;
  birthdate: string | null;
  birth_year: number | null;
  team_level: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  dominant_foot: string | null;
  profile_photo_url: string | null;
  strengths: string | null;
  focus_areas: string | null;
  long_term_development_notes: string | null;
  created_at: string;
  updated_at: string;
};

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
      parent_id,
      crm_player_id,
      name,
      age,
      birthdate::text AS birthdate,
      birth_year,
      team_level,
      primary_position,
      secondary_position,
      dominant_foot,
      profile_photo_url,
      strengths,
      focus_areas,
      long_term_development_notes,
      created_at,
      updated_at
    FROM players
    WHERE id = ${playerId}
    LIMIT 1
  `) as unknown as PlayerRow[];

  const player = rows[0];
  if (!player) return new Response("Not found", { status: 404 });

  return Response.json({ player });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as Partial<{
    name: string;
    birthdate: string | null;
    team_level: string | null;
    primary_position: string | null;
    secondary_position: string | null;
    dominant_foot: string | null;
    profile_photo_url: string | null;
    strengths: string | null;
    focus_areas: string | null;
    long_term_development_notes: string | null;
  }> | null;

  const name = body?.name !== undefined ? String(body.name).trim() : undefined;
  if (name !== undefined && !name) {
    return new Response("Player name cannot be empty.", { status: 400 });
  }

  const hasBirthdate = body?.birthdate !== undefined;
  const birthdate =
    body?.birthdate === null
      ? null
      : body?.birthdate !== undefined
      ? String(body.birthdate).trim()
      : null;
  const birthYear =
    birthdate && /^\d{4}-\d{2}-\d{2}$/.test(birthdate)
      ? Number(birthdate.slice(0, 4))
      : null;

  const rows = (await sql`
    UPDATE players
    SET
      name = COALESCE(${name ?? null}, name),
      birthdate = CASE WHEN ${hasBirthdate} THEN ${birthdate}::date ELSE birthdate END,
      birth_year = CASE WHEN ${hasBirthdate} THEN ${birthYear}::int ELSE birth_year END,
      team_level = COALESCE(${body?.team_level ?? null}, team_level),
      primary_position = COALESCE(${
        body?.primary_position ?? null
      }, primary_position),
      secondary_position = COALESCE(${
        body?.secondary_position ?? null
      }, secondary_position),
      dominant_foot = COALESCE(${body?.dominant_foot ?? null}, dominant_foot),
      profile_photo_url = COALESCE(${
        body?.profile_photo_url ?? null
      }, profile_photo_url),
      strengths = COALESCE(${body?.strengths ?? null}, strengths),
      focus_areas = COALESCE(${body?.focus_areas ?? null}, focus_areas),
      long_term_development_notes = COALESCE(${
        body?.long_term_development_notes ?? null
      }, long_term_development_notes)
    WHERE id = ${playerId}
    RETURNING
      id,
      parent_id,
      crm_player_id,
      name,
      age,
      birthdate::text AS birthdate,
      birth_year,
      team_level,
      primary_position,
      secondary_position,
      dominant_foot,
      profile_photo_url,
      strengths,
      focus_areas,
      long_term_development_notes,
      created_at,
      updated_at
  `) as unknown as PlayerRow[];

  const player = rows[0];
  if (!player) return new Response("Not found", { status: 404 });

  return Response.json({ player });
}
