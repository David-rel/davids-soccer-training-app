import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";
import {
  computePlayerProfile,
  type PlayerProfileData,
  type PlayerTestRow,
} from "@/lib/computePlayerProfile";

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
  ctx: { params: Promise<{ playerId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const sp = req.nextUrl.searchParams;
  const limitRaw = sp.get("limit");
  const limit = Math.max(
    1,
    Math.min(500, Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 200)
  );

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
    WHERE player_id = ${playerId}
    ORDER BY computed_at DESC, created_at DESC
    LIMIT ${limit}
  `) as unknown as PlayerProfileRow[];

  return Response.json({ profiles: rows });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const name =
    String(body?.name ?? "Recompute stats").trim() || "Recompute stats";

  const tests = (await sql`
    SELECT
      id,
      player_id,
      test_name,
      test_date::text AS test_date,
      scores,
      created_at,
      updated_at
    FROM player_tests
    WHERE player_id = ${playerId}
    ORDER BY test_date ASC, created_at ASC
  `) as unknown as PlayerTestRow[];

  const prevRows = (await sql`
    SELECT id, data
    FROM player_profiles
    WHERE player_id = ${playerId}
    ORDER BY computed_at DESC, created_at DESC
    LIMIT 1
  `) as unknown as Array<{ id: string; data: PlayerProfileData }>;

  const previousProfile = prevRows[0] ?? null;
  const nowIso = new Date().toISOString();

  const data = computePlayerProfile({
    tests,
    nowIso,
    previousProfile,
  });

  const inserted = (await sql`
    INSERT INTO player_profiles (player_id, name, computed_at, data)
    VALUES (${playerId}, ${name}, ${nowIso}::timestamptz, ${JSON.stringify(
    data
  )}::jsonb)
    RETURNING
      id,
      player_id,
      name,
      computed_at,
      data,
      created_at,
      updated_at
  `) as unknown as PlayerProfileRow[];

  return Response.json({ profile: inserted[0] }, { status: 201 });
}
