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
      if (!name && score === null) continue;
      found.push({ idx, name, score });
    }
    found.sort((a, b) => a.idx - b.idx);
    moves = found.map(({ name, score }) => ({ name, score }));
  }

  moves = moves.slice(0, 50);
  return { moves };
}

function cleanScores(testName: string, scores: Record<string, unknown>) {
  if (testName === "1v1") {
    return { ok: true as const, cleaned: cleanOneVOneScores(scores) };
  }
  if (testName === "Skill Moves") {
    return { ok: true as const, cleaned: cleanSkillMovesScores(scores) };
  }

  const def = getTestDefinitionByName(testName);
  if (!def) return { ok: false as const, error: "Unknown test_name" };

  const cleaned: Record<string, unknown> = {};
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

  return { ok: true as const, cleaned };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; testId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, testId } = await ctx.params;

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
    WHERE id = ${testId} AND player_id = ${playerId}
    LIMIT 1
  `) as unknown as PlayerTestRow[];

  const test = rows[0];
  if (!test) return new Response("Not found", { status: 404 });

  return Response.json({ test });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; testId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, testId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as Partial<{
    test_name: string;
    test_date: string; // YYYY-MM-DD
    scores: Record<string, unknown>;
  }> | null;

  const wantsName = body?.test_name !== undefined;
  const wantsDate = body?.test_date !== undefined;
  const wantsScores = body?.scores !== undefined;

  if (!wantsName && !wantsDate && !wantsScores) {
    return new Response("Nothing to update.", { status: 400 });
  }

  // If we need to clean scores, we need to know the effective test_name.
  let effectiveTestName: string | null = null;
  if (wantsName) {
    effectiveTestName = String(body?.test_name ?? "").trim();
    if (!effectiveTestName) {
      return new Response("test_name cannot be empty", { status: 400 });
    }
  } else if (wantsScores) {
    const existing = (await sql`
      SELECT test_name
      FROM player_tests
      WHERE id = ${testId} AND player_id = ${playerId}
      LIMIT 1
    `) as unknown as Array<{ test_name: string }>;
    if (!existing[0]) return new Response("Not found", { status: 404 });
    effectiveTestName = existing[0].test_name;
  }

  const testDate = wantsDate ? String(body?.test_date ?? "").trim() : null;
  if (wantsDate && (!testDate || !/^\d{4}-\d{2}-\d{2}$/.test(testDate))) {
    return new Response("test_date must be YYYY-MM-DD", { status: 400 });
  }

  let cleanedScoresJson: string | null = null;
  if (wantsScores) {
    const raw = (body?.scores ?? {}) as Record<string, unknown>;
    const cleaned = cleanScores(effectiveTestName ?? "", raw);
    if (!cleaned.ok) return new Response(cleaned.error, { status: 400 });
    cleanedScoresJson = JSON.stringify(cleaned.cleaned);
  }

  const rows = (await sql`
    UPDATE player_tests
    SET
      test_name = CASE WHEN ${wantsName} THEN ${effectiveTestName} ELSE test_name END,
      test_date = CASE WHEN ${wantsDate} THEN ${testDate}::date ELSE test_date END,
      scores = CASE WHEN ${wantsScores} THEN ${cleanedScoresJson}::jsonb ELSE scores END
    WHERE id = ${testId} AND player_id = ${playerId}
    RETURNING
      id,
      player_id,
      test_name,
      test_date::text AS test_date,
      scores,
      created_at,
      updated_at
  `) as unknown as PlayerTestRow[];

  const test = rows[0];
  if (!test) return new Response("Not found", { status: 404 });

  return Response.json({ test });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string; testId: string }> }
) {
  const err = assertAdmin(req);
  if (err) return err;

  const { playerId, testId } = await ctx.params;

  const rows = (await sql`
    DELETE FROM player_tests
    WHERE id = ${testId} AND player_id = ${playerId}
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  if (!rows[0]) return new Response("Not found", { status: 404 });

  return Response.json({ ok: true });
}
