import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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
  shirt_size: string | null;
  location: string | null;
  profile_photo_url: string | null;
  strengths: string | null;
  focus_areas: string | null;
  long_term_development_notes: string | null;
  created_at: string;
  updated_at: string;
};

function parseOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const parentId = token?.sub;
  if (!parentId) return new Response("Unauthorized", { status: 401 });

  const { playerId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as Partial<{
    name: string;
    birthdate: string | null;
    team_level: string | null;
    primary_position: string | null;
    secondary_position: string | null;
    dominant_foot: string | null;
    shirt_size: string | null;
    location: string | null;
    profile_photo_url: string | null;
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
  const shirtSize = parseOptionalText(body?.shirt_size);
  const location = parseOptionalText(body?.location);

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
      shirt_size = CASE
        WHEN ${body?.shirt_size !== undefined}
        THEN ${shirtSize}::text
        ELSE shirt_size
      END,
      location = CASE
        WHEN ${body?.location !== undefined}
        THEN ${location}::text
        ELSE location
      END,
      profile_photo_url = COALESCE(${
        body?.profile_photo_url ?? null
      }, profile_photo_url)
    WHERE id = ${playerId} AND parent_id = ${parentId}
    RETURNING
      id,
      parent_id,
      name,
      age,
      birthdate,
      birth_year,
      team_level,
      primary_position,
      secondary_position,
      dominant_foot,
      shirt_size,
      location,
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
