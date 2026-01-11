import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";
import type { PlayerProfileData } from "@/lib/computePlayerProfile";

type PlayerProfileRow = {
  id: string;
  player_id: string;
  name: string;
  computed_at: string;
  data: PlayerProfileData;
  created_at: string;
  updated_at: string;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; profileId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, profileId } = await ctx.params;

  const rows = (await sql`
    SELECT
      id,
      player_id,
      name,
      computed_at,
      data,
      created_at,
      updated_at
    FROM player_profiles
    WHERE id = ${profileId} AND player_id = ${playerId}
    LIMIT 1
  `) as unknown as PlayerProfileRow[];

  const profile = rows[0];
  if (!profile) return new Response("Not found", { status: 404 });

  return Response.json({ profile });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; profileId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, profileId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as Partial<{
    name: string;
  }> | null;

  const name = body?.name !== undefined ? String(body.name).trim() : undefined;
  if (name === undefined) {
    return new Response("Nothing to update.", { status: 400 });
  }
  if (!name) return new Response("name cannot be empty", { status: 400 });

  const rows = (await sql`
    UPDATE player_profiles
    SET name = ${name}
    WHERE id = ${profileId} AND player_id = ${playerId}
    RETURNING
      id,
      player_id,
      name,
      computed_at,
      data,
      created_at,
      updated_at
  `) as unknown as PlayerProfileRow[];

  const profile = rows[0];
  if (!profile) return new Response("Not found", { status: 404 });

  return Response.json({ profile });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; profileId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, profileId } = await ctx.params;

  const rows = (await sql`
    DELETE FROM player_profiles
    WHERE id = ${profileId} AND player_id = ${playerId}
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  if (!rows[0]) return new Response("Not found", { status: 404 });

  return Response.json({ ok: true });
}
