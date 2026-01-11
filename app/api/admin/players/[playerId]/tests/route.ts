import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";
import { getTestDefinitionByName } from "@/lib/testDefinitions";

type PlayerTestRow = {
  id: string;
  player_id: string;
  test_name: string;
  test_date: string; // YYYY-MM-DD
  scores: unknown;
  created_at: string;
  updated_at: string;
};

function toNullableFiniteNumber(v: unknown) {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function cleanOneVOneScores(scores: Record<string, unknown>) {
  const roundsRaw = (scores as { rounds?: unknown }).rounds;
  let rounds: Array<number | null> = [];
  if (Array.isArray(roundsRaw)) {
    rounds = roundsRaw.map(toNullableFiniteNumber);
  } else {
    const entries = Object.entries(scores)
      .map(([k, v]) => {
        const m = /^onevone_round_(\d+)$/.exec(k);
        if (!m) return null;
        return [Number(m[1]), toNullableFiniteNumber(v)] as const;
      })
      .filter(Boolean) as Array<readonly [number, number | null]>;
    entries.sort((a, b) => a[0] - b[0]);
    rounds = entries.map((e) => e[1]);
  }

  rounds = rounds.slice(0, 50);
  return { rounds };
}

function cleanSkillMovesScores(scores: Record<string, unknown>) {
  const movesRaw = (scores as { moves?: unknown }).moves;
  let moves: Array<{ name: string; score: number | null }> = [];
  if (Array.isArray(movesRaw)) {
    moves = movesRaw
      .map((m) => {
        const obj = (m ?? {}) as Record<string, unknown>;
        const name = String(obj.name ?? "").trim();
        const score = toNullableFiniteNumber(obj.score);
        if (!name && score === null) return null;
        return { name: name || "Move", score };
      })
      .filter(Boolean) as Array<{ name: string; score: number | null }>;
  } else {
    // Back-compat for older `{ skillmove_1: 3, ... }` format (and optional `skillmove_name_1`).
    const found: Array<{ idx: number; name: string; score: number | null }> =
      [];
    for (const [k, v] of Object.entries(scores)) {
      const m = /^skillmove_(\d+)$/.exec(k);
      if (!m) continue;
      const idx = Number(m[1]);
      const score = toNullableFiniteNumber(v);
      const nameKey = `skillmove_name_${idx}`;
      const rawName = scores[nameKey];
      const name =
        rawName === undefined || rawName === null
          ? `Move ${idx}`
          : String(rawName).trim() || `Move ${idx}`;
      if (score === null && !name) continue;
      found.push({ idx, name, score });
    }
    found.sort((a, b) => a.idx - b.idx);
    moves = found.map(({ name, score }) => ({ name, score }));
  }

  moves = moves.slice(0, 50);
  return { moves };
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
      test_name,
      test_date::text AS test_date,
      scores,
      created_at,
      updated_at
    FROM player_tests
    WHERE player_id = ${playerId}
    ORDER BY test_date DESC, created_at DESC
  `) as unknown as PlayerTestRow[];

  return Response.json({ tests: rows });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as {
    test_name?: string;
    test_date?: string;
    scores?: Record<string, unknown>;
  } | null;

  const testName = String(body?.test_name ?? "").trim();
  const testDate = String(body?.test_date ?? "").trim();
  const scores = (body?.scores ?? {}) as Record<string, unknown>;

  if (!testName) return new Response("test_name is required", { status: 400 });
  if (!testDate || !/^\d{4}-\d{2}-\d{2}$/.test(testDate)) {
    return new Response("test_date must be YYYY-MM-DD", { status: 400 });
  }

  const def = getTestDefinitionByName(testName);
  if (!def) return new Response("Unknown test_name", { status: 400 });

  let cleaned: Record<string, unknown> = {};
  if (testName === "1v1") {
    cleaned = cleanOneVOneScores(scores);
  } else if (testName === "Skill Moves") {
    cleaned = cleanSkillMovesScores(scores);
  } else {
    // Only keep keys we recognize for that test (and coerce numbers where possible).
    for (const f of def.fields) {
      const v = scores[f.key];
      if (v === undefined || v === null || v === "") continue;
      if (f.type === "number") {
        const n = typeof v === "number" ? v : Number(v);
        if (!Number.isFinite(n)) continue;
        cleaned[f.key] = n;
      } else {
        cleaned[f.key] = String(v);
      }
    }
  }

  const rows = (await sql`
    INSERT INTO player_tests (player_id, test_name, test_date, scores)
    VALUES (${playerId}, ${testName}, ${testDate}::date, ${JSON.stringify(
    cleaned
  )}::jsonb)
    RETURNING
      id,
      player_id,
      test_name,
      test_date::text AS test_date,
      scores,
      created_at,
      updated_at
  `) as unknown as PlayerTestRow[];

  return Response.json({ test: rows[0] }, { status: 201 });
}
