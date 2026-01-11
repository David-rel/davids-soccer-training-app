import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

type PlayerRow = {
  id: string;
  parent_id: string;
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
  ctx: { params: Promise<{ parentId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { parentId } = await ctx.params;

  const players = (await sql`
    SELECT
      id,
      parent_id,
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
    WHERE parent_id = ${parentId}
    ORDER BY created_at DESC
  `) as unknown as PlayerRow[];

  return Response.json({ players });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ parentId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { parentId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as Partial<{
    name: string;
    birthdate: string;
    team_level: string;
    primary_position: string;
    secondary_position: string;
    dominant_foot: string;
    profile_photo_url: string;
    strengths: string;
    focus_areas: string;
    long_term_development_notes: string;
  }> | null;

  const name = String(body?.name ?? "").trim();
  if (!name) return new Response("Player name is required.", { status: 400 });

  const birthdate = body?.birthdate ? String(body.birthdate).trim() : null;
  const birthYear =
    birthdate && /^\d{4}-\d{2}-\d{2}$/.test(birthdate)
      ? Number(birthdate.slice(0, 4))
      : null;

  const rows = (await sql`
    INSERT INTO players (
      parent_id,
      name,
      birthdate,
      birth_year,
      team_level,
      primary_position,
      secondary_position,
      dominant_foot,
      profile_photo_url,
      strengths,
      focus_areas,
      long_term_development_notes
    )
    VALUES (
      ${parentId},
      ${name},
      ${birthdate},
      ${birthYear},
      ${body?.team_level ?? null},
      ${body?.primary_position ?? null},
      ${body?.secondary_position ?? null},
      ${body?.dominant_foot ?? null},
      ${body?.profile_photo_url ?? null},
      ${body?.strengths ?? null},
      ${body?.focus_areas ?? null},
      ${body?.long_term_development_notes ?? null}
    )
    RETURNING
      id,
      parent_id,
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

  return Response.json({ player: rows[0] }, { status: 201 });
}
