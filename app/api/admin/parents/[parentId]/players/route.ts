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

type ParentLinkRow = {
  id: string;
  crm_parent_id: number | null;
};

type CrmPlayerRow = {
  id: number;
  parent_id: number;
  name: string;
  age: number | null;
  team: string | null;
};

function parseOptionalPositiveInt(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return "invalid";
  return parsed;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ parentId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { parentId } = await ctx.params;

  const players = (await sql`
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
    WHERE parent_id = ${parentId}
    ORDER BY created_at DESC
  `) as unknown as PlayerRow[];

  return Response.json({ players });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ parentId: string }> }
) {
  const err = await assertAdmin(req);
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
    crm_player_id: number | string | null;
  }> | null;

  const parentRows = (await sql`
    SELECT id, crm_parent_id
    FROM parents
    WHERE id = ${parentId}
    LIMIT 1
  `) as unknown as ParentLinkRow[];
  const parent = parentRows[0];
  if (!parent) return new Response("Parent not found.", { status: 404 });

  const crmPlayerId = parseOptionalPositiveInt(body?.crm_player_id);
  if (crmPlayerId === "invalid") {
    return new Response("crm_player_id must be a positive integer.", {
      status: 400,
    });
  }

  let crmPlayer: CrmPlayerRow | null = null;
  if (crmPlayerId !== null) {
    const existingLink = (await sql`
      SELECT id
      FROM players
      WHERE crm_player_id = ${crmPlayerId}
      LIMIT 1
    `) as unknown as Array<{ id: string }>;
    if (existingLink[0]) {
      return new Response("That CRM player is already linked in the app.", {
        status: 409,
      });
    }

    const crmRows = (await sql`
      SELECT id, parent_id, name, age, team
      FROM crm_players
      WHERE id = ${crmPlayerId}
      LIMIT 1
    `) as unknown as CrmPlayerRow[];
    crmPlayer = crmRows[0] ?? null;
    if (!crmPlayer) {
      return new Response("CRM player not found.", { status: 404 });
    }

    if (parent.crm_parent_id !== null && parent.crm_parent_id !== crmPlayer.parent_id) {
      return new Response("CRM player belongs to a different CRM parent.", {
        status: 409,
      });
    }

    if (parent.crm_parent_id === null) {
      const conflictingParent = (await sql`
        SELECT id
        FROM parents
        WHERE crm_parent_id = ${crmPlayer.parent_id}
          AND id <> ${parentId}
        LIMIT 1
      `) as unknown as Array<{ id: string }>;
      if (conflictingParent[0]) {
        return new Response(
          "CRM parent is already linked to another app parent.",
          { status: 409 }
        );
      }

      await sql`
        UPDATE parents
        SET crm_parent_id = ${crmPlayer.parent_id}
        WHERE id = ${parentId}
          AND crm_parent_id IS NULL
      `;
    }
  }

  const providedName = String(body?.name ?? "").trim();
  const name = providedName || String(crmPlayer?.name ?? "").trim();
  if (!name) return new Response("Player name is required.", { status: 400 });

  const birthdate = body?.birthdate ? String(body.birthdate).trim() : null;
  const birthYear =
    birthdate && /^\d{4}-\d{2}-\d{2}$/.test(birthdate)
      ? Number(birthdate.slice(0, 4))
      : null;
  const age = crmPlayer?.age ?? null;
  const providedTeamLevel = String(body?.team_level ?? "").trim();
  const teamLevel = providedTeamLevel || crmPlayer?.team || null;

  const rows = (await sql`
    INSERT INTO players (
      parent_id,
      crm_player_id,
      name,
      age,
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
      ${crmPlayerId},
      ${name},
      ${age},
      ${birthdate},
      ${birthYear},
      ${teamLevel},
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

  return Response.json({ player: rows[0] }, { status: 201 });
}
