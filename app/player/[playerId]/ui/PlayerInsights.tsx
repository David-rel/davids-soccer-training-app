"use client";

import { TEST_DEFINITIONS } from "@/lib/testDefinitions";
import { useEffect, useMemo, useState } from "react";

type Profile = {
  id: string;
  player_id: string;
  name: string;
  computed_at: string;
  data: {
    raw_tests?: Array<{
      id: string;
      test_name: string;
      test_date: string;
      scores: Record<string, unknown>;
    }>;
    inputs?: Record<string, unknown>;
    metrics?: Record<string, number | null>;
    comparisons?: { deltas?: Record<string, number | null> };
  };
};

type PlayerTest = {
  id: string;
  player_id: string;
  test_name: string;
  test_date: string; // YYYY-MM-DD
  scores: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function asNullableNumber(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function getOneVOneRounds(scores: Record<string, unknown>) {
  const roundsRaw = (scores as { rounds?: unknown }).rounds;
  if (Array.isArray(roundsRaw)) {
    return roundsRaw.map((v) => asNullableNumber(v));
  }
  const entries = Object.entries(scores)
    .map(([k, v]) => {
      const m = /^onevone_round_(\d+)$/.exec(k);
      if (!m) return null;
      return [Number(m[1]), asNullableNumber(v)] as const;
    })
    .filter((x): x is readonly [number, number | null] => x !== null)
    .sort((a, b) => a[0] - b[0]);
  return entries.map((e) => e[1]);
}

function getSkillMoves(
  scores: Record<string, unknown>
): Array<{ name: string; score: number | null }> {
  const movesRaw = (scores as { moves?: unknown }).moves;
  if (Array.isArray(movesRaw)) {
    return movesRaw.map((m, i) => {
      const obj = (m ?? {}) as Record<string, unknown>;
      const name = String(obj.name ?? "").trim() || `Move ${i + 1}`;
      const score = asNullableNumber(obj.score);
      return { name, score };
    });
  }
  const entries = Object.entries(scores)
    .map(([k, v]) => {
      const m = /^skillmove_(\d+)$/.exec(k);
      if (!m) return null;
      const idx = Number(m[1]);
      const nameKey = `skillmove_name_${idx}`;
      const rawName = scores[nameKey];
      const name =
        rawName === null || rawName === undefined
          ? `Move ${idx}`
          : String(rawName).trim() || `Move ${idx}`;
      const score = asNullableNumber(v);
      return { idx, name, score };
    })
    .filter(
      (x): x is { idx: number; name: string; score: number | null } =>
        x !== null
    )
    .sort((a, b) => a.idx - b.idx);
  return entries.map(({ name, score }) => ({ name, score }));
}

function fmt(n: number | null | undefined, decimals = 2) {
  if (n === null || n === undefined) return "—";
  return Number(n).toFixed(decimals);
}

function fmtInt(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return String(Math.round(n));
}

function fmtPct(n: number | null | undefined, decimals = 1) {
  if (n === null || n === undefined) return "—";
  return `${Number(n).toFixed(decimals)}%`;
}

function fmtSigned(n: number | null | undefined, decimals = 2) {
  if (n === null || n === undefined) return null;
  const v = Number(n);
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(decimals)}`;
}

function nonZeroDelta(
  n: number | null | undefined,
  epsilon = 1e-9
): number | null {
  if (n === null || n === undefined) return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.abs(v) < epsilon ? null : v;
}

type DerivedMetric = {
  key: string;
  label: string;
  description: string;
  valueFmt?: (n: number | null | undefined) => string;
  deltaFmt?: (n: number | null | undefined) => string | null;
};

const DERIVED_METRICS_BY_TEST: Record<string, DerivedMetric[]> = {
  Power: [
    {
      key: "shot_power_strong_avg",
      label: "Strong avg",
      description: "Average of the 4 strong-foot shot power attempts.",
      valueFmt: fmt,
    },
    {
      key: "shot_power_weak_avg",
      label: "Weak avg",
      description: "Average of the 4 weak-foot shot power attempts.",
      valueFmt: fmt,
    },
    {
      key: "shot_power_asymmetry_pct",
      label: "Asymmetry",
      description:
        "Percent difference between strong and weak averages (higher = bigger gap).",
      valueFmt: fmtPct,
    },
    {
      key: "shot_power_strong_max",
      label: "Strong max",
      description: "Best (highest) strong-foot shot power attempt.",
      valueFmt: fmtInt,
    },
    {
      key: "shot_power_weak_max",
      label: "Weak max",
      description: "Best (highest) weak-foot shot power attempt.",
      valueFmt: fmtInt,
    },
  ],
  "Serve Distance": [
    {
      key: "serve_distance_strong_avg",
      label: "Strong avg",
      description: "Average of the 4 strong-foot serve distances.",
      valueFmt: fmt,
    },
    {
      key: "serve_distance_weak_avg",
      label: "Weak avg",
      description: "Average of the 4 weak-foot serve distances.",
      valueFmt: fmt,
    },
    {
      key: "serve_distance_asymmetry_pct",
      label: "Asymmetry",
      description:
        "Percent difference between strong and weak averages (higher = bigger gap).",
      valueFmt: fmtPct,
    },
    {
      key: "serve_distance_strong_max",
      label: "Strong max",
      description: "Best (farthest) strong-foot serve distance.",
      valueFmt: fmtInt,
    },
    {
      key: "serve_distance_weak_max",
      label: "Weak max",
      description: "Best (farthest) weak-foot serve distance.",
      valueFmt: fmtInt,
    },
  ],
  "Figure 8 Loops": [
    {
      key: "figure8_loops_both",
      label: "Both",
      description: "Total loops using both feet (combined).",
      valueFmt: fmtInt,
    },
    {
      key: "figure8_loops_weak",
      label: "Weak",
      description: "Total loops using the weak foot.",
      valueFmt: fmtInt,
    },
    {
      key: "figure8_loops_strong",
      label: "Strong",
      description: "Total loops using the strong foot.",
      valueFmt: fmtInt,
    },
    {
      key: "figure8_asymmetry_pct",
      label: "Asymmetry",
      description:
        "Percent difference between strong and weak loops (higher = bigger gap).",
      valueFmt: fmtPct,
    },
  ],
  "Passing Gates": [
    {
      key: "passing_gates_total_hits",
      label: "Total hits",
      description: "Strong hits + weak hits.",
      valueFmt: fmtInt,
    },
    {
      key: "passing_gates_strong_hits",
      label: "Strong hits",
      description: "Total strong-foot passing gate hits.",
      valueFmt: fmtInt,
    },
    {
      key: "passing_gates_weak_hits",
      label: "Weak hits",
      description: "Total weak-foot passing gate hits.",
      valueFmt: fmtInt,
    },
    {
      key: "passing_gates_weak_share_pct",
      label: "Weak share",
      description: "Weak hits divided by total hits.",
      valueFmt: fmtPct,
    },
    {
      key: "passing_gates_asymmetry_pct",
      label: "Asymmetry",
      description:
        "Percent difference between strong and weak hits (higher = bigger gap).",
      valueFmt: fmtPct,
    },
  ],
  "1v1": [
    {
      key: "one_v_one_avg_score",
      label: "Avg score",
      description: "Average score across all rounds.",
      valueFmt: fmt,
    },
    {
      key: "one_v_one_total_score",
      label: "Total score",
      description: "Sum of all round scores.",
      valueFmt: fmtInt,
    },
    {
      key: "one_v_one_best_round",
      label: "Best round",
      description: "Highest single round score.",
      valueFmt: fmtInt,
    },
    {
      key: "one_v_one_worst_round",
      label: "Worst round",
      description: "Lowest single round score.",
      valueFmt: fmtInt,
    },
    {
      key: "one_v_one_consistency_range",
      label: "Range",
      description: "Best round minus worst round (lower = more consistent).",
      valueFmt: fmtInt,
    },
  ],
  Juggling: [
    {
      key: "juggle_best",
      label: "Best",
      description: "Best single juggling attempt.",
      valueFmt: fmtInt,
    },
    {
      key: "juggle_best2_sum",
      label: "Best 2 sum",
      description: "Sum of the best two attempts.",
      valueFmt: fmtInt,
    },
    {
      key: "juggle_avg_all",
      label: "Avg",
      description: "Average across all attempts.",
      valueFmt: fmt,
    },
    {
      key: "juggle_total",
      label: "Total",
      description: "Sum across all attempts.",
      valueFmt: fmtInt,
    },
    {
      key: "juggle_consistency_range",
      label: "Range",
      description:
        "Best attempt minus worst attempt (lower = more consistent).",
      valueFmt: fmtInt,
    },
  ],
  "Skill Moves": [
    {
      key: "skill_moves_avg_rating",
      label: "Avg rating",
      description: "Average rating across all skill moves.",
      valueFmt: fmt,
    },
    {
      key: "skill_moves_total_rating",
      label: "Total",
      description: "Sum of all skill move ratings.",
      valueFmt: fmtInt,
    },
    {
      key: "skill_moves_best_rating",
      label: "Best",
      description: "Best (highest) single skill move rating.",
      valueFmt: fmtInt,
    },
    {
      key: "skill_moves_worst_rating",
      label: "Worst",
      description: "Worst (lowest) single skill move rating.",
      valueFmt: fmtInt,
    },
    {
      key: "skill_moves_consistency_range",
      label: "Range",
      description: "Best rating minus worst rating (lower = more consistent).",
      valueFmt: fmtInt,
    },
  ],
  "5-10-5 Agility": [
    {
      key: "agility_5_10_5_best_time",
      label: "Best",
      description: "Fastest trial time (lower is better).",
      valueFmt: fmt,
    },
    {
      key: "agility_5_10_5_avg_time",
      label: "Avg",
      description: "Average trial time (lower is better).",
      valueFmt: fmt,
    },
    {
      key: "agility_5_10_5_worst_time",
      label: "Worst",
      description: "Slowest trial time (lower is better).",
      valueFmt: fmt,
    },
    {
      key: "agility_5_10_5_consistency_range",
      label: "Range",
      description: "Worst minus best time (lower = more consistent).",
      valueFmt: fmt,
    },
  ],
  "Reaction Sprint": [
    {
      key: "reaction_5m_total_time_best",
      label: "Total best",
      description: "Fastest total time (lower is better).",
      valueFmt: fmt,
    },
    {
      key: "reaction_5m_total_time_avg",
      label: "Total avg",
      description: "Average total time (lower is better).",
      valueFmt: fmt,
    },
    {
      key: "reaction_5m_total_time_worst",
      label: "Total worst",
      description: "Slowest total time (lower is better).",
      valueFmt: fmt,
    },
    {
      key: "reaction_5m_reaction_time_best",
      label: "Cue best",
      description: "Fastest reaction time (lower is better).",
      valueFmt: fmt,
    },
    {
      key: "reaction_5m_reaction_time_avg",
      label: "Cue avg",
      description: "Average reaction time (lower is better).",
      valueFmt: fmt,
    },
  ],
  "Single-leg Hop": [
    {
      key: "single_leg_hop_left",
      label: "Left max",
      description: "Best (highest) left-leg hop.",
      valueFmt: fmtInt,
    },
    {
      key: "single_leg_hop_right",
      label: "Right max",
      description: "Best (highest) right-leg hop.",
      valueFmt: fmtInt,
    },
    {
      key: "single_leg_hop_left_avg",
      label: "Left avg",
      description: "Average left-leg hop across attempts.",
      valueFmt: fmt,
    },
    {
      key: "single_leg_hop_right_avg",
      label: "Right avg",
      description: "Average right-leg hop across attempts.",
      valueFmt: fmt,
    },
    {
      key: "single_leg_hop_asymmetry_pct",
      label: "Asymmetry",
      description:
        "Percent difference between left and right max hop (higher = bigger gap).",
      valueFmt: fmtPct,
    },
  ],
  "Double-leg Jumps": [
    {
      key: "double_leg_jumps_first10",
      label: "First 10s",
      description: "Reps completed in the first 10 seconds.",
      valueFmt: fmtInt,
    },
    {
      key: "double_leg_jumps_mid10",
      label: "Mid 10s",
      description: "Reps completed from 10s to 20s.",
      valueFmt: fmtInt,
    },
    {
      key: "double_leg_jumps_last10",
      label: "Last 10s",
      description: "Reps completed from 20s to 30s.",
      valueFmt: fmtInt,
    },
    {
      key: "double_leg_jumps_total_reps",
      label: "Total 30s",
      description: "Total reps completed in 30 seconds.",
      valueFmt: fmtInt,
    },
    {
      key: "double_leg_jumps_dropoff_pct",
      label: "Dropoff",
      description:
        "Estimated fatigue: how much the last 10s dropped vs first 10s (higher = more dropoff).",
      valueFmt: fmtPct,
    },
  ],
  "Ankle Dorsiflexion": [
    {
      key: "ankle_dorsiflex_left_cm",
      label: "Left (cm)",
      description: "Left ankle dorsiflexion converted to centimeters.",
      valueFmt: fmt,
    },
    {
      key: "ankle_dorsiflex_right_cm",
      label: "Right (cm)",
      description: "Right ankle dorsiflexion converted to centimeters.",
      valueFmt: fmt,
    },
    {
      key: "ankle_dorsiflex_avg_cm",
      label: "Avg (cm)",
      description: "Average of left and right dorsiflexion (cm).",
      valueFmt: fmt,
    },
    {
      key: "ankle_dorsiflex_asymmetry_pct",
      label: "Asymmetry",
      description:
        "Percent difference between left and right dorsiflexion (higher = bigger gap).",
      valueFmt: fmtPct,
    },
  ],
  "Core Plank": [
    {
      key: "core_plank_hold_sec",
      label: "Hold (sec)",
      description: "Total hold time in seconds.",
      valueFmt: fmtInt,
    },
    {
      key: "core_plank_form_flag",
      label: "Form flag",
      description: "1 = good form, 0 = poor form (coach flag).",
      valueFmt: fmtInt,
    },
    {
      key: "core_plank_hold_sec_if_good_form",
      label: "Hold if good form",
      description:
        "Hold time if form was good; otherwise 0 (penalizes poor form).",
      valueFmt: fmtInt,
    },
  ],
};

function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="group inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        aria-label="Metric info"
      >
        i
        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus:opacity-100">
          {text}
        </span>
      </button>
    </span>
  );
}

function Sparkline({
  values,
  lowerIsBetter = false,
}: {
  values: Array<number | null>;
  lowerIsBetter?: boolean;
}) {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length < 2) {
    return (
      <div className="h-10 w-full rounded-xl border border-emerald-200 bg-emerald-50" />
    );
  }

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const w = 220;
  const h = 40;
  const pad = 4;

  const points = values
    .map((v, i) => {
      if (typeof v !== "number") return null;
      const x = (i / (values.length - 1)) * (w - pad * 2) + pad;
      const t = max === min ? 0.5 : (v - min) / (max - min);
      const y = (1 - t) * (h - pad * 2) + pad;
      return [x, y] as const;
    })
    .filter(Boolean) as Array<readonly [number, number]>;

  const d = points
    .map(
      ([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
    )
    .join(" ");

  const last = nums[nums.length - 1];
  const first = nums[0];
  const improved = lowerIsBetter ? last < first : last > first;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-10 w-full rounded-xl border border-emerald-200 bg-white"
      preserveAspectRatio="none"
    >
      <path d={d} fill="none" stroke="#059669" strokeWidth="2" />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="2.8"
        fill={improved ? "#059669" : "#111827"}
      />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  delta,
  unit,
  spark,
  details,
}: {
  title: string;
  value: string;
  delta?: string | null;
  unit?: string;
  spark: React.ReactNode;
  details?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {value}
            {unit ? (
              <span className="ml-1 text-sm text-gray-600">{unit}</span>
            ) : null}
          </div>
        </div>
        {delta ? (
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {delta}
          </div>
        ) : null}
      </div>
      <div className="mt-3">{spark}</div>
      {details ? <div className="mt-4">{details}</div> : null}
    </div>
  );
}

export function PlayerInsights({ playerId }: { playerId: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tests, setTests] = useState<PlayerTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const [profilesRes, testsRes] = await Promise.all([
          fetch(`/api/players/${playerId}/profiles`, { cache: "no-store" }),
          fetch(`/api/players/${playerId}/tests`, { cache: "no-store" }),
        ]);

        if (profilesRes.ok) {
          const data = (await profilesRes.json()) as { profiles: Profile[] };
          if (!cancelled) setProfiles(data.profiles ?? []);
        }

        if (testsRes.ok) {
          const data = (await testsRes.json()) as { tests: PlayerTest[] };
          if (!cancelled) setTests(data.tests ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const latest = profiles.length ? profiles[profiles.length - 1] : null;
  const rawTests = latest?.data?.raw_tests ?? [];
  const latestMetrics = latest?.data?.metrics ?? {};
  const latestDeltas = latest?.data?.comparisons?.deltas ?? {};

  const latestByTestName = useMemo(() => {
    const map = new Map<
      string,
      { test_date: string; scores: Record<string, unknown> }
    >();

    for (const t of tests) {
      const existing = map.get(t.test_name);
      if (!existing || t.test_date > existing.test_date) {
        map.set(t.test_name, {
          test_date: t.test_date,
          scores: t.scores ?? {},
        });
      }
    }
    for (const t of rawTests) {
      const existing = map.get(t.test_name);
      if (!existing || t.test_date > existing.test_date) {
        map.set(t.test_name, {
          test_date: t.test_date,
          scores: t.scores ?? {},
        });
      }
    }
    return map;
  }, [rawTests, tests]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
        Loading insights…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Most recent tests
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Showing the latest entry for each test.
        </p>

        {tests.length === 0 && rawTests.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-emerald-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            No tests recorded yet.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {TEST_DEFINITIONS.map((def) => {
              const t = latestByTestName.get(def.name);
              if (!t) return null;

              const oneVOneRounds =
                def.name === "1v1" ? getOneVOneRounds(t.scores ?? {}) : null;
              const oneVOneRoundsList = oneVOneRounds ?? [];
              const oneVOneRoundsCount = oneVOneRoundsList.length;

              const skillMoves =
                def.name === "Skill Moves"
                  ? getSkillMoves(t.scores ?? {})
                  : null;
              const skillMovesList = skillMoves ?? [];
              const skillMovesCount = skillMovesList.length;

              return (
                <div
                  key={def.id}
                  className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {def.name}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {t.test_date}
                      </div>
                    </div>
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Latest
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {def.name === "1v1" ? (
                      <>
                        <div className="sm:col-span-2 text-xs font-semibold text-gray-700">
                          Scores (each round is 0–3)
                        </div>
                        {(oneVOneRoundsCount ? oneVOneRoundsList : []).map(
                          (v, i) => (
                            <div
                              key={`onevone-${i}`}
                              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-2"
                            >
                              <div className="text-sm text-gray-700">
                                Round {i + 1}
                              </div>
                              <div className="text-sm font-semibold text-gray-900">
                                {v === null ? "—" : String(v)}
                              </div>
                            </div>
                          )
                        )}
                        {oneVOneRoundsCount === 0 ? (
                          <div className="text-sm text-gray-600">
                            No rounds recorded.
                          </div>
                        ) : null}
                      </>
                    ) : def.name === "Skill Moves" ? (
                      <>
                        <div className="sm:col-span-2 text-xs font-semibold text-gray-700">
                          Moves (each move is 1–5)
                        </div>
                        {(skillMovesCount ? skillMovesList : []).map((m, i) => (
                          <div
                            key={`move-${i}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-2"
                          >
                            <div className="text-sm text-gray-700">
                              {m.name}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                              {m.score === null ? "—" : String(m.score)}
                            </div>
                          </div>
                        ))}
                        {skillMovesCount === 0 ? (
                          <div className="text-sm text-gray-600">
                            No moves recorded.
                          </div>
                        ) : null}
                      </>
                    ) : (
                      def.fields.map((f) => {
                        const raw = t.scores?.[f.key];
                        const value =
                          raw === null || raw === undefined || raw === ""
                            ? "—"
                            : String(raw);
                        return (
                          <div
                            key={f.key}
                            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-2"
                          >
                            <div className="text-sm text-gray-700">
                              {f.label}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                              {value}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {DERIVED_METRICS_BY_TEST[def.name]?.length ? (
                    <div className="mt-4 border-t border-emerald-200 pt-4">
                      <div className="text-xs font-semibold text-gray-900">
                        Derived metrics
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {DERIVED_METRICS_BY_TEST[def.name].map((m) => {
                          const rawValue = latestMetrics[m.key];
                          const rawDelta = nonZeroDelta(latestDeltas[m.key]);
                          let value = (m.valueFmt ?? fmt)(rawValue);

                          // Add score scales for clarity on parent dashboard.
                          if (def.name === "1v1") {
                            const maxTotal =
                              oneVOneRoundsCount > 0
                                ? oneVOneRoundsCount * 3
                                : null;
                            if (
                              m.key === "one_v_one_avg_score" ||
                              m.key === "one_v_one_best_round" ||
                              m.key === "one_v_one_worst_round"
                            ) {
                              value = `${value} / 3`;
                            }
                            if (m.key === "one_v_one_total_score" && maxTotal) {
                              value = `${fmtInt(rawValue)} / ${maxTotal}`;
                            }
                          }

                          if (def.name === "Skill Moves") {
                            const maxTotal =
                              skillMovesCount > 0 ? skillMovesCount * 5 : null;
                            if (
                              m.key === "skill_moves_avg_rating" ||
                              m.key === "skill_moves_best_rating" ||
                              m.key === "skill_moves_worst_rating"
                            ) {
                              value = `${value} / 5`;
                            }
                            if (
                              m.key === "skill_moves_total_rating" &&
                              maxTotal
                            ) {
                              value = `${fmtInt(rawValue)} / ${maxTotal}`;
                            }
                          }

                          const delta = fmtSigned(rawDelta, 2);
                          return (
                            <div
                              key={m.key}
                              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-2"
                            >
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <span>{m.label}</span>
                                <InfoTip text={m.description} />
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-gray-900">
                                  {value}
                                </div>
                                {delta ? (
                                  <div className="text-xs font-semibold text-gray-500">
                                    ({delta})
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
