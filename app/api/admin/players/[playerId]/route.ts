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
  first_touch_rating: number | null;
  first_touch_notes: string | null;
  one_v_one_ability_rating: number | null;
  one_v_one_ability_notes: string | null;
  passing_technique_rating: number | null;
  passing_technique_notes: string | null;
  shot_technique_rating: number | null;
  shot_technique_notes: string | null;
  vision_recognition_rating: number | null;
  vision_recognition_notes: string | null;
  great_soccer_habits_rating: number | null;
  great_soccer_habits_notes: string | null;
  created_at: string;
  updated_at: string;
};

function parseOptionalRating(
  value: unknown
): number | null | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return "invalid";
  return parsed;
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
      first_touch_rating,
      first_touch_notes,
      one_v_one_ability_rating,
      one_v_one_ability_notes,
      passing_technique_rating,
      passing_technique_notes,
      shot_technique_rating,
      shot_technique_notes,
      vision_recognition_rating,
      vision_recognition_notes,
      great_soccer_habits_rating,
      great_soccer_habits_notes,
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
    first_touch_rating: number | string | null;
    first_touch_notes: string | null;
    one_v_one_ability_rating: number | string | null;
    one_v_one_ability_notes: string | null;
    passing_technique_rating: number | string | null;
    passing_technique_notes: string | null;
    shot_technique_rating: number | string | null;
    shot_technique_notes: string | null;
    vision_recognition_rating: number | string | null;
    vision_recognition_notes: string | null;
    great_soccer_habits_rating: number | string | null;
    great_soccer_habits_notes: string | null;
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

  const firstTouchRating = parseOptionalRating(body?.first_touch_rating);
  const oneVOneAbilityRating = parseOptionalRating(
    body?.one_v_one_ability_rating
  );
  const passingTechniqueRating = parseOptionalRating(
    body?.passing_technique_rating
  );
  const shotTechniqueRating = parseOptionalRating(body?.shot_technique_rating);
  const visionRecognitionRating = parseOptionalRating(
    body?.vision_recognition_rating
  );
  const greatSoccerHabitsRating = parseOptionalRating(
    body?.great_soccer_habits_rating
  );

  if (
    firstTouchRating === "invalid" ||
    oneVOneAbilityRating === "invalid" ||
    passingTechniqueRating === "invalid" ||
    shotTechniqueRating === "invalid" ||
    visionRecognitionRating === "invalid" ||
    greatSoccerHabitsRating === "invalid"
  ) {
    return new Response("Skill ratings must be whole numbers from 1 to 5.", {
      status: 400,
    });
  }

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
      }, long_term_development_notes),
      first_touch_rating = CASE
        WHEN ${body?.first_touch_rating !== undefined}
        THEN ${firstTouchRating ?? null}::smallint
        ELSE first_touch_rating
      END,
      first_touch_notes = CASE
        WHEN ${body?.first_touch_notes !== undefined}
        THEN ${body?.first_touch_notes ?? null}
        ELSE first_touch_notes
      END,
      one_v_one_ability_rating = CASE
        WHEN ${body?.one_v_one_ability_rating !== undefined}
        THEN ${oneVOneAbilityRating ?? null}::smallint
        ELSE one_v_one_ability_rating
      END,
      one_v_one_ability_notes = CASE
        WHEN ${body?.one_v_one_ability_notes !== undefined}
        THEN ${body?.one_v_one_ability_notes ?? null}
        ELSE one_v_one_ability_notes
      END,
      passing_technique_rating = CASE
        WHEN ${body?.passing_technique_rating !== undefined}
        THEN ${passingTechniqueRating ?? null}::smallint
        ELSE passing_technique_rating
      END,
      passing_technique_notes = CASE
        WHEN ${body?.passing_technique_notes !== undefined}
        THEN ${body?.passing_technique_notes ?? null}
        ELSE passing_technique_notes
      END,
      shot_technique_rating = CASE
        WHEN ${body?.shot_technique_rating !== undefined}
        THEN ${shotTechniqueRating ?? null}::smallint
        ELSE shot_technique_rating
      END,
      shot_technique_notes = CASE
        WHEN ${body?.shot_technique_notes !== undefined}
        THEN ${body?.shot_technique_notes ?? null}
        ELSE shot_technique_notes
      END,
      vision_recognition_rating = CASE
        WHEN ${body?.vision_recognition_rating !== undefined}
        THEN ${visionRecognitionRating ?? null}::smallint
        ELSE vision_recognition_rating
      END,
      vision_recognition_notes = CASE
        WHEN ${body?.vision_recognition_notes !== undefined}
        THEN ${body?.vision_recognition_notes ?? null}
        ELSE vision_recognition_notes
      END,
      great_soccer_habits_rating = CASE
        WHEN ${body?.great_soccer_habits_rating !== undefined}
        THEN ${greatSoccerHabitsRating ?? null}::smallint
        ELSE great_soccer_habits_rating
      END,
      great_soccer_habits_notes = CASE
        WHEN ${body?.great_soccer_habits_notes !== undefined}
        THEN ${body?.great_soccer_habits_notes ?? null}
        ELSE great_soccer_habits_notes
      END
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
      first_touch_rating,
      first_touch_notes,
      one_v_one_ability_rating,
      one_v_one_ability_notes,
      passing_technique_rating,
      passing_technique_notes,
      shot_technique_rating,
      shot_technique_notes,
      vision_recognition_rating,
      vision_recognition_notes,
      great_soccer_habits_rating,
      great_soccer_habits_notes,
      created_at,
      updated_at
  `) as unknown as PlayerRow[];

  const player = rows[0];
  if (!player) return new Response("Not found", { status: 404 });

  return Response.json({ player });
}
