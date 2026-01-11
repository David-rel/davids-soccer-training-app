"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { TEST_DEFINITIONS } from "@/lib/testDefinitions";

type Player = {
  id: string;
  parent_id: string;
  name: string;
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

type PlayerTest = {
  id: string;
  player_id: string;
  test_name: string;
  test_date: string; // YYYY-MM-DD
  scores: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type PlayerProfile = {
  id: string;
  player_id: string;
  name: string;
  computed_at: string;
  data: unknown;
  created_at: string;
  updated_at: string;
};

type PlayerGoal = {
  id: string;
  player_id: string;
  name: string;
  due_date: string | null; // YYYY-MM-DD
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

async function api<T>(
  path: string,
  opts: RequestInit & { securityCode: string }
): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "content-type": "application/json",
      "x-security-code": opts.securityCode,
      ...(opts.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 placeholder:text-gray-500 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-50"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-y rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 placeholder:text-gray-500 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
      />
    </div>
  );
}

function calcBirthMeta(birthdate: string | null | undefined) {
  if (!birthdate || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    return {
      age: null as number | null,
      birthYear: null as number | null,
      ageGroup: null as string | null,
    };
  }
  const birthYear = Number(birthdate.slice(0, 4));
  const [y, m, d] = birthdate.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  const hasHadBirthday =
    now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!hasHadBirthday) age -= 1;
  if (age < 0 || age > 120) age = 0;
  const ageGroup = age ? `U${age}` : null;
  return { age, birthYear, ageGroup };
}

export default function AdminPlayerClient(props: {
  params: Promise<{ playerId: string }>;
}) {
  const [isPending, startTransition] = useTransition();

  const [securityCode, setSecurityCode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [draft, setDraft] = useState<Player | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Testing evaluations
  const [tests, setTests] = useState<PlayerTest[]>([]);
  const [goals, setGoals] = useState<PlayerGoal[]>([]);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDueDate, setNewGoalDueDate] = useState<string>("");
  const [goalDrafts, setGoalDrafts] = useState<
    Record<string, { name: string; due_date: string }>
  >({});
  const [testName, setTestName] = useState<string>(
    TEST_DEFINITIONS[0]?.name ?? ""
  );
  const [testDate, setTestDate] = useState<string>("");
  const [testScores, setTestScores] = useState<Record<string, string>>({});
  const [oneVOneRoundsCount, setOneVOneRoundsCount] = useState<number>(5);
  const [oneVOneRounds, setOneVOneRounds] = useState<string[]>(
    Array.from({ length: 5 }, () => "")
  );
  const [skillMovesCount, setSkillMovesCount] = useState<number>(6);
  const [skillMoves, setSkillMoves] = useState<
    Array<{ name: string; score: string }>
  >(
    Array.from({ length: 6 }, (_, i) => ({ name: `Move ${i + 1}`, score: "" }))
  );

  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);

  const computed = useMemo(
    () => calcBirthMeta(draft?.birthdate ?? null),
    [draft?.birthdate]
  );

  useEffect(() => {
    // Always require the code here too.
    setAuthorized(false);
    setPlayer(null);
    setDraft(null);
    setMsg(null);
    setErrMsg(null);
    props.params.then(({ playerId }) => setPlayerId(playerId));
  }, [props.params]);

  async function verify(code: string) {
    setAuthError(null);
    await api<{ ok: true }>("/api/admin/verify", {
      method: "GET",
      securityCode: code,
    });
    setAuthorized(true);
  }

  async function loadPlayer(code: string, id: string) {
    const data = await api<{ player: Player }>(`/api/admin/players/${id}`, {
      method: "GET",
      securityCode: code,
    });
    setPlayer(data.player);
    setDraft(data.player);
  }

  async function loadTests(code: string, id: string) {
    const data = await api<{ tests: PlayerTest[] }>(
      `/api/admin/players/${id}/tests`,
      { method: "GET", securityCode: code }
    );
    setTests(data.tests);
  }

  async function loadProfiles(code: string, id: string) {
    const data = await api<{ profiles: PlayerProfile[] }>(
      `/api/admin/players/${id}/profiles?limit=500`,
      { method: "GET", securityCode: code }
    );
    setProfiles(data.profiles);
  }

  async function loadGoals(code: string, id: string) {
    const data = await api<{ goals: PlayerGoal[] }>(
      `/api/admin/players/${id}/goals`,
      { method: "GET", securityCode: code }
    );
    setGoals(data.goals ?? []);
    setGoalDrafts((prev) => {
      const next = { ...prev };
      for (const g of data.goals ?? []) {
        if (!next[g.id]) {
          next[g.id] = { name: g.name, due_date: g.due_date ?? "" };
        }
      }
      return next;
    });
  }

  async function createGoal(code: string, id: string) {
    const name = newGoalName.trim();
    if (!name) {
      setErrMsg("Goal name is required.");
      return;
    }
    const due = newGoalDueDate.trim();
    await api<{ goal: PlayerGoal }>(`/api/admin/players/${id}/goals`, {
      method: "POST",
      securityCode: code,
      body: JSON.stringify({ name, due_date: due || null }),
    });
    setNewGoalName("");
    setNewGoalDueDate("");
    await loadGoals(code, id);
  }

  async function saveGoal(
    code: string,
    playerId: string,
    goalId: string,
    patch: Partial<Pick<PlayerGoal, "name" | "due_date" | "completed">>
  ) {
    await api<{ goal: PlayerGoal }>(
      `/api/admin/players/${playerId}/goals/${goalId}`,
      {
        method: "PATCH",
        securityCode: code,
        body: JSON.stringify(patch),
      }
    );
    await loadGoals(code, playerId);
  }

  async function deleteGoal(code: string, playerId: string, goalId: string) {
    await api<{ ok: true }>(`/api/admin/players/${playerId}/goals/${goalId}`, {
      method: "DELETE",
      securityCode: code,
    });
    await loadGoals(code, playerId);
  }

  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editTestName, setEditTestName] = useState<string>("");
  const [editTestDate, setEditTestDate] = useState<string>("");
  const [editTestScores, setEditTestScores] = useState<Record<string, string>>(
    {}
  );
  const [editOneVOneRoundsCount, setEditOneVOneRoundsCount] =
    useState<number>(5);
  const [editOneVOneRounds, setEditOneVOneRounds] = useState<string[]>(
    Array.from({ length: 5 }, () => "")
  );
  const [editSkillMovesCount, setEditSkillMovesCount] = useState<number>(6);
  const [editSkillMoves, setEditSkillMoves] = useState<
    Array<{ name: string; score: string }>
  >(
    Array.from({ length: 6 }, (_, i) => ({ name: `Move ${i + 1}`, score: "" }))
  );

  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState<string>("");

  function clampCount(raw: string, min: number, max: number, fallback: number) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(n)));
  }

  function resizeArray<T>(arr: T[], nextLen: number, make: (i: number) => T) {
    if (nextLen <= 0) return [];
    if (arr.length === nextLen) return arr;
    if (arr.length > nextLen) return arr.slice(0, nextLen);
    return [
      ...arr,
      ...Array.from({ length: nextLen - arr.length }, (_, i) =>
        make(arr.length + i)
      ),
    ];
  }

  function beginEditTest(t: PlayerTest) {
    setEditingTestId(t.id);
    setEditTestName(t.test_name);
    setEditTestDate(t.test_date);

    const scores = (t.scores ?? {}) as Record<string, unknown>;
    if (t.test_name === "1v1") {
      const roundsRaw = (scores as { rounds?: unknown }).rounds;
      const rounds = Array.isArray(roundsRaw)
        ? roundsRaw.map((v) => (v === null || v === undefined ? "" : String(v)))
        : Object.entries(scores)
            .map(([k, v]) => {
              const m = /^onevone_round_(\d+)$/.exec(k);
              if (!m) return null;
              return [Number(m[1]), v] as const;
            })
            .filter((x): x is readonly [number, unknown] => x !== null)
            .sort((a, b) => a[0] - b[0])
            .map(([, v]) => (v === null || v === undefined ? "" : String(v)));

      const count = rounds.length ? rounds.length : 5;
      setEditOneVOneRoundsCount(count);
      setEditOneVOneRounds(resizeArray(rounds, count, () => ""));
      setEditTestScores({});
      setEditSkillMovesCount(6);
      setEditSkillMoves(
        Array.from({ length: 6 }, (_, i) => ({
          name: `Move ${i + 1}`,
          score: "",
        }))
      );
      return;
    }

    if (t.test_name === "Skill Moves") {
      const movesRaw = (scores as { moves?: unknown }).moves;
      const moves = Array.isArray(movesRaw)
        ? movesRaw.map((m) => {
            const obj = (m ?? {}) as Record<string, unknown>;
            return {
              name: String(obj.name ?? "").trim(),
              score:
                obj.score === null || obj.score === undefined
                  ? ""
                  : String(obj.score),
            };
          })
        : Object.entries(scores)
            .map(([k, v]) => {
              const m = /^skillmove_(\d+)$/.exec(k);
              if (!m) return null;
              const idx = Number(m[1]);
              const nameKey = `skillmove_name_${idx}`;
              const rawName = scores[nameKey];
              return {
                idx,
                name:
                  rawName === null || rawName === undefined
                    ? `Move ${idx}`
                    : String(rawName).trim() || `Move ${idx}`,
                score: v === null || v === undefined ? "" : String(v),
              };
            })
            .filter(
              (x): x is { idx: number; name: string; score: string } =>
                x !== null
            )
            .sort((a, b) => a.idx - b.idx)
            .map(({ name, score }) => ({ name, score }));

      const count = moves.length ? moves.length : 6;
      setEditSkillMovesCount(count);
      setEditSkillMoves(
        resizeArray(moves, count, (i) => ({ name: `Move ${i + 1}`, score: "" }))
      );
      setEditTestScores({});
      setEditOneVOneRoundsCount(5);
      setEditOneVOneRounds(Array.from({ length: 5 }, () => ""));
      return;
    }

    const asStrings: Record<string, string> = {};
    for (const [k, v] of Object.entries(scores)) {
      if (v === null || v === undefined) continue;
      asStrings[k] = String(v);
    }
    setEditTestScores(asStrings);
  }

  async function saveTestEdits() {
    if (!playerId || !editingTestId) return;
    setMsg(null);
    setErrMsg(null);

    if (!editTestDate) {
      setErrMsg("Test date is required.");
      return;
    }

    const scores =
      editTestName === "1v1"
        ? { rounds: editOneVOneRounds }
        : editTestName === "Skill Moves"
        ? { moves: editSkillMoves }
        : editTestScores;

    await api<{ test: PlayerTest }>(
      `/api/admin/players/${playerId}/tests/${editingTestId}`,
      {
        method: "PATCH",
        securityCode,
        body: JSON.stringify({
          test_name: editTestName,
          test_date: editTestDate,
          scores,
        }),
      }
    );
    await loadTests(securityCode, playerId);
    setEditingTestId(null);
    setMsg("Test updated.");
  }

  async function deleteTest(testId: string) {
    if (!playerId) return;
    setMsg(null);
    setErrMsg(null);
    await api<{ ok: true }>(`/api/admin/players/${playerId}/tests/${testId}`, {
      method: "DELETE",
      securityCode,
    });
    await loadTests(securityCode, playerId);
    if (editingTestId === testId) setEditingTestId(null);
    setMsg("Test deleted.");
  }

  function beginEditProfile(p: PlayerProfile) {
    setEditingProfileId(p.id);
    setEditProfileName(p.name);
  }

  async function saveProfileEdits() {
    if (!playerId || !editingProfileId) return;
    setMsg(null);
    setErrMsg(null);
    const name = editProfileName.trim();
    if (!name) {
      setErrMsg("Profile name is required.");
      return;
    }
    await api<{ profile: PlayerProfile }>(
      `/api/admin/players/${playerId}/profiles/${editingProfileId}`,
      {
        method: "PATCH",
        securityCode,
        body: JSON.stringify({ name }),
      }
    );
    await loadProfiles(securityCode, playerId);
    setEditingProfileId(null);
    setMsg("Profile updated.");
  }

  async function deleteProfile(profileId: string) {
    if (!playerId) return;
    setMsg(null);
    setErrMsg(null);
    await api<{ ok: true }>(
      `/api/admin/players/${playerId}/profiles/${profileId}`,
      { method: "DELETE", securityCode }
    );
    await loadProfiles(securityCode, playerId);
    if (editingProfileId === profileId) setEditingProfileId(null);
    setMsg("Profile deleted.");
  }

  const changed = useMemo(() => {
    if (!player || !draft) return false;
    return JSON.stringify(player) !== JSON.stringify(draft);
  }, [player, draft]);

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />

      <header className="relative border-b border-emerald-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="Admin"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl"
            />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Admin • Player editor
              </div>
              <div className="text-sm text-gray-600">
                {draft?.name ?? "Player"} {playerId ? `(${playerId})` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              Back to admin
            </Link>
            {authorized && (
              <button
                type="button"
                onClick={() => {
                  setAuthorized(false);
                  setSecurityCode("");
                  setPlayer(null);
                  setDraft(null);
                }}
                className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Lock
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-10">
        {!authorized ? (
          <div className="mx-auto max-w-md rounded-3xl border border-emerald-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <h1 className="text-xl font-semibold text-gray-900">
              Enter security code
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Required again for this page.
            </p>

            {authError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {authError}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <Field
                label="SECURITY_CODE"
                value={securityCode}
                onChange={setSecurityCode}
                type="password"
                placeholder="Enter code"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (!playerId) return;
                    await verify(securityCode);
                    await loadPlayer(securityCode, playerId);
                    await loadTests(securityCode, playerId);
                    await loadProfiles(securityCode, playerId);
                    await loadGoals(securityCode, playerId);
                  } catch (e) {
                    setAuthError(
                      e instanceof Error ? e.message : "Unauthorized"
                    );
                  }
                }}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Enter
              </button>
            </div>
          </div>
        ) : !draft ? (
          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            Loading…
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Player profile
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Edit everything here (admin).
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!playerId) return;
                      setMsg(null);
                      setErrMsg(null);
                      await loadPlayer(securityCode, playerId);
                      await loadTests(securityCode, playerId);
                      await loadProfiles(securityCode, playerId);
                      await loadGoals(securityCode, playerId);
                      setMsg("Refreshed.");
                    }}
                    disabled={isPending}
                    className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:opacity-60"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {(errMsg || msg) && (
                <div
                  className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                    errMsg
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {errMsg ?? msg}
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Name"
                  value={draft.name}
                  onChange={(v) => setDraft({ ...draft, name: v })}
                />
                <Field
                  label="Team / level"
                  value={draft.team_level ?? ""}
                  onChange={(v) =>
                    setDraft({ ...draft, team_level: v || null })
                  }
                />
                <Field
                  label="Birthday"
                  value={draft.birthdate ?? ""}
                  onChange={(v) => setDraft({ ...draft, birthdate: v || null })}
                  type="date"
                />
                <Field
                  label="Computed (age / birth year / age group)"
                  value={[
                    computed.age !== null ? `Age ${computed.age}` : "Age —",
                    computed.birthYear !== null
                      ? `Birth year ${computed.birthYear}`
                      : "Birth year —",
                    computed.ageGroup ?? "Age group —",
                  ].join(" • ")}
                  onChange={() => {}}
                  disabled
                />
                <Field
                  label="Primary position"
                  value={draft.primary_position ?? ""}
                  onChange={(v) =>
                    setDraft({ ...draft, primary_position: v || null })
                  }
                />
                <Field
                  label="Secondary position"
                  value={draft.secondary_position ?? ""}
                  onChange={(v) =>
                    setDraft({ ...draft, secondary_position: v || null })
                  }
                />
                <Field
                  label="Dominant foot"
                  value={draft.dominant_foot ?? ""}
                  onChange={(v) =>
                    setDraft({ ...draft, dominant_foot: v || null })
                  }
                />
                <Field
                  label="Profile photo URL"
                  value={draft.profile_photo_url ?? ""}
                  onChange={(v) =>
                    setDraft({ ...draft, profile_photo_url: v || null })
                  }
                />
              </div>

              <div className="mt-6 grid gap-4">
                <TextArea
                  label="Strengths"
                  value={draft.strengths ?? ""}
                  onChange={(v) => setDraft({ ...draft, strengths: v || null })}
                />
                <TextArea
                  label="Focus areas"
                  value={draft.focus_areas ?? ""}
                  onChange={(v) =>
                    setDraft({ ...draft, focus_areas: v || null })
                  }
                />
                <TextArea
                  label="Long-term development notes"
                  value={draft.long_term_development_notes ?? ""}
                  onChange={(v) =>
                    setDraft({
                      ...draft,
                      long_term_development_notes: v || null,
                    })
                  }
                />
              </div>

              <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Goals
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Add, edit, and complete goals for this player.
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <input
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    placeholder="New goal (e.g., 50 juggles without drop)"
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 sm:col-span-2"
                  />
                  <input
                    value={newGoalDueDate}
                    onChange={(e) => setNewGoalDueDate(e.target.value)}
                    type="date"
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!playerId) return;
                      setMsg(null);
                      setErrMsg(null);
                      startTransition(async () => {
                        try {
                          await createGoal(securityCode, playerId);
                          setMsg("Goal added.");
                        } catch (e) {
                          setErrMsg(
                            e instanceof Error
                              ? e.message
                              : "Failed to add goal."
                          );
                        }
                      });
                    }}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Add goal
                  </button>
                </div>

                {(() => {
                  const todo = goals.filter((g) => !g.completed);
                  const done = goals.filter((g) => g.completed);

                  return (
                    <div className="mt-5 space-y-5">
                      <div>
                        <div className="text-xs font-semibold text-gray-900">
                          To do
                        </div>
                        <div className="mt-2 grid gap-2">
                          {todo.length === 0 ? (
                            <div className="text-sm text-gray-600">
                              No active goals yet.
                            </div>
                          ) : (
                            todo.map((g) => {
                              const d = goalDrafts[g.id] ?? {
                                name: g.name,
                                due_date: g.due_date ?? "",
                              };
                              return (
                                <div
                                  key={g.id}
                                  className="rounded-2xl border border-emerald-200 bg-white p-4"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <label className="flex items-start gap-3">
                                      <input
                                        type="checkbox"
                                        checked={g.completed}
                                        onChange={(e) => {
                                          if (!playerId) return;
                                          const next = e.target.checked;
                                          startTransition(async () => {
                                            try {
                                              await saveGoal(
                                                securityCode,
                                                playerId,
                                                g.id,
                                                { completed: next }
                                              );
                                            } catch (e2) {
                                              setErrMsg(
                                                e2 instanceof Error
                                                  ? e2.message
                                                  : "Failed to update goal."
                                              );
                                            }
                                          });
                                        }}
                                        className="mt-1 h-4 w-4 accent-emerald-600"
                                      />
                                      <div className="min-w-[240px] flex-1">
                                        <input
                                          value={d.name}
                                          onChange={(e) =>
                                            setGoalDrafts((prev) => ({
                                              ...prev,
                                              [g.id]: {
                                                ...d,
                                                name: e.target.value,
                                              },
                                            }))
                                          }
                                          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                        />
                                        <div className="mt-2">
                                          <input
                                            value={d.due_date}
                                            onChange={(e) =>
                                              setGoalDrafts((prev) => ({
                                                ...prev,
                                                [g.id]: {
                                                  ...d,
                                                  due_date: e.target.value,
                                                },
                                              }))
                                            }
                                            type="date"
                                            className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                          />
                                        </div>
                                      </div>
                                    </label>

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => {
                                          if (!playerId) return;
                                          setMsg(null);
                                          setErrMsg(null);
                                          startTransition(async () => {
                                            try {
                                              await saveGoal(
                                                securityCode,
                                                playerId,
                                                g.id,
                                                {
                                                  name: d.name.trim(),
                                                  due_date: d.due_date || null,
                                                }
                                              );
                                              setMsg("Goal saved.");
                                            } catch (e2) {
                                              setErrMsg(
                                                e2 instanceof Error
                                                  ? e2.message
                                                  : "Failed to save goal."
                                              );
                                            }
                                          });
                                        }}
                                        className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:opacity-60"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => {
                                          if (!playerId) return;
                                          if (
                                            window.confirm(
                                              `Delete goal "${g.name}"?`
                                            )
                                          ) {
                                            setMsg(null);
                                            setErrMsg(null);
                                            startTransition(async () => {
                                              try {
                                                await deleteGoal(
                                                  securityCode,
                                                  playerId,
                                                  g.id
                                                );
                                                setMsg("Goal deleted.");
                                              } catch (e2) {
                                                setErrMsg(
                                                  e2 instanceof Error
                                                    ? e2.message
                                                    : "Failed to delete goal."
                                                );
                                              }
                                            });
                                          }
                                        }}
                                        className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:border-red-300 disabled:opacity-60"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-900">
                          Completed
                        </div>
                        <div className="mt-2 grid gap-2">
                          {done.length === 0 ? (
                            <div className="text-sm text-gray-600">
                              No completed goals yet.
                            </div>
                          ) : (
                            done.map((g) => (
                              <div
                                key={g.id}
                                className="rounded-2xl border border-emerald-200 bg-white px-4 py-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <label className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={g.completed}
                                      onChange={(e) => {
                                        if (!playerId) return;
                                        const next = e.target.checked;
                                        startTransition(async () => {
                                          try {
                                            await saveGoal(
                                              securityCode,
                                              playerId,
                                              g.id,
                                              { completed: next }
                                            );
                                          } catch (e2) {
                                            setErrMsg(
                                              e2 instanceof Error
                                                ? e2.message
                                                : "Failed to update goal."
                                            );
                                          }
                                        });
                                      }}
                                      className="h-4 w-4 accent-emerald-600"
                                    />
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900 line-through">
                                        {g.name}
                                      </div>
                                      <div className="mt-0.5 text-xs text-gray-600">
                                        {g.completed_at
                                          ? `Completed ${new Date(
                                              g.completed_at
                                            ).toLocaleDateString()}`
                                          : "Completed"}
                                        {g.due_date
                                          ? ` • Due ${g.due_date}`
                                          : ""}
                                      </div>
                                    </div>
                                  </label>
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => {
                                      if (!playerId) return;
                                      if (
                                        window.confirm(
                                          `Delete completed goal "${g.name}"?`
                                        )
                                      ) {
                                        startTransition(async () => {
                                          try {
                                            await deleteGoal(
                                              securityCode,
                                              playerId,
                                              g.id
                                            );
                                          } catch (e2) {
                                            setErrMsg(
                                              e2 instanceof Error
                                                ? e2.message
                                                : "Failed to delete goal."
                                            );
                                          }
                                        });
                                      }
                                    }}
                                    className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:border-red-300 disabled:opacity-60"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!player) return;
                    setDraft(player);
                    setMsg(null);
                    setErrMsg(null);
                  }}
                  className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={!changed || isPending}
                  onClick={() => {
                    if (!draft) return;
                    setMsg(null);
                    setErrMsg(null);

                    const name = draft.name.trim();
                    if (!name) {
                      setErrMsg("Name is required.");
                      return;
                    }

                    startTransition(async () => {
                      try {
                        const data = await api<{ player: Player }>(
                          `/api/admin/players/${draft.id}`,
                          {
                            method: "PATCH",
                            securityCode,
                            body: JSON.stringify({
                              name,
                              birthdate: draft.birthdate,
                              team_level: draft.team_level,
                              primary_position: draft.primary_position,
                              secondary_position: draft.secondary_position,
                              dominant_foot: draft.dominant_foot,
                              profile_photo_url: draft.profile_photo_url,
                              strengths: draft.strengths,
                              focus_areas: draft.focus_areas,
                              long_term_development_notes:
                                draft.long_term_development_notes,
                            }),
                          }
                        );
                        setPlayer(data.player);
                        setDraft(data.player);
                        setMsg("Saved.");
                      } catch (e) {
                        setErrMsg(
                          e instanceof Error ? e.message : "Save failed."
                        );
                      }
                    });
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Testing evaluations
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Create a test entry for this player.
                </p>

                <div className="mt-5 grid gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Test
                    </label>
                    <select
                      value={testName}
                      onChange={(e) => {
                        const next = e.target.value;
                        setTestName(next);
                        setTestScores({});
                        if (next === "1v1") {
                          setOneVOneRoundsCount(5);
                          setOneVOneRounds(Array.from({ length: 5 }, () => ""));
                        }
                        if (next === "Skill Moves") {
                          setSkillMovesCount(6);
                          setSkillMoves(
                            Array.from({ length: 6 }, (_, i) => ({
                              name: `Move ${i + 1}`,
                              score: "",
                            }))
                          );
                        }
                      }}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    >
                      {TEST_DEFINITIONS.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Field
                    label="Test date"
                    value={testDate}
                    onChange={setTestDate}
                    type="date"
                  />

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-semibold text-gray-900">
                      Scores
                    </div>
                    <div className="mt-3 grid gap-3">
                      {testName === "1v1" ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-sm text-gray-700">
                              Number of rounds
                            </div>
                            <input
                              value={String(oneVOneRoundsCount)}
                              onChange={(e) => {
                                const next = clampCount(
                                  e.target.value,
                                  1,
                                  50,
                                  5
                                );
                                setOneVOneRoundsCount(next);
                                setOneVOneRounds((prev) =>
                                  resizeArray(prev, next, () => "")
                                );
                              }}
                              inputMode="numeric"
                              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                            />
                          </div>

                          {oneVOneRounds.map((v, i) => (
                            <div key={i} className="grid grid-cols-2 gap-3">
                              <div className="text-sm text-gray-700">
                                Round {i + 1} score
                              </div>
                              <input
                                value={v}
                                onChange={(e) =>
                                  setOneVOneRounds((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i ? e.target.value : x
                                    )
                                  )
                                }
                                inputMode="decimal"
                                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                placeholder="—"
                              />
                            </div>
                          ))}
                        </>
                      ) : testName === "Skill Moves" ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-sm text-gray-700">
                              Number of moves
                            </div>
                            <input
                              value={String(skillMovesCount)}
                              onChange={(e) => {
                                const next = clampCount(
                                  e.target.value,
                                  1,
                                  50,
                                  6
                                );
                                setSkillMovesCount(next);
                                setSkillMoves((prev) =>
                                  resizeArray(prev, next, (i) => ({
                                    name: `Move ${i + 1}`,
                                    score: "",
                                  }))
                                );
                              }}
                              inputMode="numeric"
                              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                            />
                          </div>

                          {skillMoves.map((m, i) => (
                            <div key={i} className="grid gap-3 sm:grid-cols-3">
                              <input
                                value={m.name}
                                onChange={(e) =>
                                  setSkillMoves((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? { ...x, name: e.target.value }
                                        : x
                                    )
                                  )
                                }
                                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 sm:col-span-2"
                                placeholder={`Move ${i + 1} name`}
                              />
                              <input
                                value={m.score}
                                onChange={(e) =>
                                  setSkillMoves((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? { ...x, score: e.target.value }
                                        : x
                                    )
                                  )
                                }
                                inputMode="decimal"
                                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                placeholder="Score"
                              />
                            </div>
                          ))}
                        </>
                      ) : (
                        (
                          TEST_DEFINITIONS.find((t) => t.name === testName)
                            ?.fields ?? []
                        ).map((f) => (
                          <div key={f.key} className="grid grid-cols-2 gap-3">
                            <div className="text-sm text-gray-700">
                              {f.label}
                            </div>
                            <input
                              value={testScores[f.key] ?? ""}
                              onChange={(e) =>
                                setTestScores((prev) => ({
                                  ...prev,
                                  [f.key]: e.target.value,
                                }))
                              }
                              inputMode={
                                f.type === "number" ? "decimal" : "text"
                              }
                              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                              placeholder="—"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!playerId) return;
                      setMsg(null);
                      setErrMsg(null);

                      if (!testDate) {
                        setErrMsg("Test date is required.");
                        return;
                      }

                      startTransition(async () => {
                        try {
                          const scores =
                            testName === "1v1"
                              ? { rounds: oneVOneRounds }
                              : testName === "Skill Moves"
                              ? { moves: skillMoves }
                              : testScores;

                          await api<{ test: PlayerTest }>(
                            `/api/admin/players/${playerId}/tests`,
                            {
                              method: "POST",
                              securityCode,
                              body: JSON.stringify({
                                test_name: testName,
                                test_date: testDate,
                                scores,
                              }),
                            }
                          );

                          setTestScores({});
                          setOneVOneRounds(Array.from({ length: 5 }, () => ""));
                          setOneVOneRoundsCount(5);
                          setSkillMoves(
                            Array.from({ length: 6 }, (_, i) => ({
                              name: `Move ${i + 1}`,
                              score: "",
                            }))
                          );
                          setSkillMovesCount(6);
                          await loadTests(securityCode, playerId);
                          setMsg("Test saved.");
                        } catch (e) {
                          setErrMsg(
                            e instanceof Error
                              ? e.message
                              : "Failed to save test."
                          );
                        }
                      });
                    }}
                    disabled={isPending}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isPending ? "Saving…" : "Save test"}
                  </button>
                </div>

                <div className="mt-6 border-t border-emerald-200 pt-4">
                  <div className="text-xs font-semibold text-gray-900">
                    All tests
                  </div>
                  <div className="mt-3 grid gap-2">
                    {tests.length === 0 ? (
                      <div className="text-sm text-gray-600">No tests yet.</div>
                    ) : (
                      tests.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-2xl border border-emerald-200 bg-white px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold text-gray-900">
                              {t.test_name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {t.test_date}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {(() => {
                              const s = (t.scores ?? {}) as Record<
                                string,
                                unknown
                              >;
                              if (
                                t.test_name === "1v1" &&
                                Array.isArray(
                                  (s as { rounds?: unknown }).rounds
                                )
                              ) {
                                return `${
                                  (s as { rounds: unknown[] }).rounds.length
                                } rounds`;
                              }
                              if (
                                t.test_name === "Skill Moves" &&
                                Array.isArray((s as { moves?: unknown }).moves)
                              ) {
                                return `${
                                  (s as { moves: unknown[] }).moves.length
                                } moves`;
                              }
                              return `${Object.keys(s).length} fields`;
                            })()}
                          </div>
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs font-semibold text-emerald-700">
                              View scores
                            </summary>
                            <pre className="mt-3 max-h-56 overflow-auto rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-gray-800">
                              {JSON.stringify(t.scores ?? {}, null, 2)}
                            </pre>
                          </details>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => beginEditTest(t)}
                              className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete test "${t.test_name}" on ${t.test_date}?`
                                  )
                                ) {
                                  startTransition(async () => {
                                    try {
                                      await deleteTest(t.id);
                                    } catch (e) {
                                      setErrMsg(
                                        e instanceof Error
                                          ? e.message
                                          : "Failed to delete test."
                                      );
                                    }
                                  });
                                }
                              }}
                              className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:border-red-300"
                            >
                              Delete
                            </button>
                          </div>

                          {editingTestId === t.id && (
                            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                              <div className="text-xs font-semibold text-gray-900">
                                Edit test
                              </div>

                              <div className="mt-3 grid gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-sm font-medium text-gray-700">
                                    Test
                                  </label>
                                  <select
                                    value={editTestName}
                                    onChange={(e) => {
                                      const next = e.target.value;
                                      setEditTestName(next);
                                      setEditTestScores({});
                                      if (next === "1v1") {
                                        setEditOneVOneRoundsCount(5);
                                        setEditOneVOneRounds(
                                          Array.from({ length: 5 }, () => "")
                                        );
                                      }
                                      if (next === "Skill Moves") {
                                        setEditSkillMovesCount(6);
                                        setEditSkillMoves(
                                          Array.from({ length: 6 }, (_, i) => ({
                                            name: `Move ${i + 1}`,
                                            score: "",
                                          }))
                                        );
                                      }
                                    }}
                                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                  >
                                    {TEST_DEFINITIONS.map((td) => (
                                      <option key={td.id} value={td.name}>
                                        {td.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <Field
                                  label="Test date"
                                  value={editTestDate}
                                  onChange={setEditTestDate}
                                  type="date"
                                />

                                <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                                  <div className="text-xs font-semibold text-gray-900">
                                    Scores
                                  </div>
                                  <div className="mt-3 grid gap-3">
                                    {editTestName === "1v1" ? (
                                      <>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="text-sm text-gray-700">
                                            Number of rounds
                                          </div>
                                          <input
                                            value={String(
                                              editOneVOneRoundsCount
                                            )}
                                            onChange={(e) => {
                                              const next = clampCount(
                                                e.target.value,
                                                1,
                                                50,
                                                5
                                              );
                                              setEditOneVOneRoundsCount(next);
                                              setEditOneVOneRounds((prev) =>
                                                resizeArray(
                                                  prev,
                                                  next,
                                                  () => ""
                                                )
                                              );
                                            }}
                                            inputMode="numeric"
                                            className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                          />
                                        </div>
                                        {editOneVOneRounds.map((v, i) => (
                                          <div
                                            key={i}
                                            className="grid grid-cols-2 gap-3"
                                          >
                                            <div className="text-sm text-gray-700">
                                              Round {i + 1} score
                                            </div>
                                            <input
                                              value={v}
                                              onChange={(e) =>
                                                setEditOneVOneRounds((prev) =>
                                                  prev.map((x, idx) =>
                                                    idx === i
                                                      ? e.target.value
                                                      : x
                                                  )
                                                )
                                              }
                                              inputMode="decimal"
                                              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                              placeholder="—"
                                            />
                                          </div>
                                        ))}
                                      </>
                                    ) : editTestName === "Skill Moves" ? (
                                      <>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="text-sm text-gray-700">
                                            Number of moves
                                          </div>
                                          <input
                                            value={String(editSkillMovesCount)}
                                            onChange={(e) => {
                                              const next = clampCount(
                                                e.target.value,
                                                1,
                                                50,
                                                6
                                              );
                                              setEditSkillMovesCount(next);
                                              setEditSkillMoves((prev) =>
                                                resizeArray(
                                                  prev,
                                                  next,
                                                  (i) => ({
                                                    name: `Move ${i + 1}`,
                                                    score: "",
                                                  })
                                                )
                                              );
                                            }}
                                            inputMode="numeric"
                                            className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                          />
                                        </div>
                                        {editSkillMoves.map((m, i) => (
                                          <div
                                            key={i}
                                            className="grid gap-3 sm:grid-cols-3"
                                          >
                                            <input
                                              value={m.name}
                                              onChange={(e) =>
                                                setEditSkillMoves((prev) =>
                                                  prev.map((x, idx) =>
                                                    idx === i
                                                      ? {
                                                          ...x,
                                                          name: e.target.value,
                                                        }
                                                      : x
                                                  )
                                                )
                                              }
                                              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 sm:col-span-2"
                                              placeholder={`Move ${i + 1} name`}
                                            />
                                            <input
                                              value={m.score}
                                              onChange={(e) =>
                                                setEditSkillMoves((prev) =>
                                                  prev.map((x, idx) =>
                                                    idx === i
                                                      ? {
                                                          ...x,
                                                          score: e.target.value,
                                                        }
                                                      : x
                                                  )
                                                )
                                              }
                                              inputMode="decimal"
                                              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                              placeholder="Score"
                                            />
                                          </div>
                                        ))}
                                      </>
                                    ) : (
                                      (
                                        TEST_DEFINITIONS.find(
                                          (td) => td.name === editTestName
                                        )?.fields ?? []
                                      ).map((f) => (
                                        <div
                                          key={f.key}
                                          className="grid grid-cols-2 gap-3"
                                        >
                                          <div className="text-sm text-gray-700">
                                            {f.label}
                                          </div>
                                          <input
                                            value={editTestScores[f.key] ?? ""}
                                            onChange={(e) =>
                                              setEditTestScores((prev) => ({
                                                ...prev,
                                                [f.key]: e.target.value,
                                              }))
                                            }
                                            inputMode={
                                              f.type === "number"
                                                ? "decimal"
                                                : "text"
                                            }
                                            className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                            placeholder="—"
                                          />
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingTestId(null)}
                                    className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => {
                                      startTransition(async () => {
                                        try {
                                          await saveTestEdits();
                                        } catch (e) {
                                          setErrMsg(
                                            e instanceof Error
                                              ? e.message
                                              : "Failed to update test."
                                          );
                                        }
                                      });
                                    }}
                                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                                  >
                                    {isPending ? "Saving…" : "Save changes"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">Meta</div>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="text-gray-500">Parent ID:</span>{" "}
                    <span className="font-mono text-gray-800">
                      {draft.parent_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>{" "}
                    <span className="text-gray-800">{draft.created_at}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Updated:</span>{" "}
                    <span className="text-gray-800">{draft.updated_at}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Player profile snapshots
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Recompute derived stats from all tests (creates a new
                      snapshot each time).
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    disabled={isPending || !playerId}
                    onClick={() => {
                      if (!playerId) return;
                      setMsg(null);
                      setErrMsg(null);
                      startTransition(async () => {
                        try {
                          await api<{ profile: PlayerProfile }>(
                            `/api/admin/players/${playerId}/profiles`,
                            {
                              method: "POST",
                              securityCode,
                              body: JSON.stringify({
                                name: `Recompute ${new Date().toLocaleString()}`,
                              }),
                            }
                          );
                          await loadProfiles(securityCode, playerId);
                          setMsg("Profile recomputed.");
                        } catch (e) {
                          setErrMsg(
                            e instanceof Error
                              ? e.message
                              : "Failed to recompute profile."
                          );
                        }
                      });
                    }}
                    className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isPending ? "Working…" : "Recompute stats"}
                  </button>
                </div>

                <div className="mt-5 border-t border-emerald-200 pt-4">
                  <div className="text-xs font-semibold text-gray-900">
                    All profile snapshots
                  </div>
                  <div className="mt-3 grid gap-2">
                    {profiles.length === 0 ? (
                      <div className="text-sm text-gray-600">
                        No profile snapshots yet.
                      </div>
                    ) : (
                      profiles.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-2xl border border-emerald-200 bg-white px-4 py-3"
                        >
                          {editingProfileId === p.id ? (
                            <div className="space-y-3">
                              <Field
                                label="Profile name"
                                value={editProfileName}
                                onChange={setEditProfileName}
                              />

                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingProfileId(null)}
                                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => {
                                    startTransition(async () => {
                                      try {
                                        await saveProfileEdits();
                                      } catch (e) {
                                        setErrMsg(
                                          e instanceof Error
                                            ? e.message
                                            : "Failed to update profile."
                                        );
                                      }
                                    });
                                  }}
                                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                                >
                                  {isPending ? "Saving…" : "Save changes"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-sm font-semibold text-gray-900">
                                  {p.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(p.computed_at).toLocaleString()}
                                </div>
                              </div>

                              <details className="mt-3">
                                <summary className="cursor-pointer text-xs font-semibold text-emerald-700">
                                  View data
                                </summary>
                                <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-gray-800">
                                  {JSON.stringify(p.data, null, 2)}
                                </pre>
                              </details>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => beginEditProfile(p)}
                                  className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300"
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Delete profile snapshot "${p.name}"?`
                                      )
                                    ) {
                                      startTransition(async () => {
                                        try {
                                          await deleteProfile(p.id);
                                        } catch (e) {
                                          setErrMsg(
                                            e instanceof Error
                                              ? e.message
                                              : "Failed to delete profile."
                                          );
                                        }
                                      });
                                    }
                                  }}
                                  className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:border-red-300"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-gray-700 shadow-sm">
                This page intentionally requires the security code again. We do
                not persist it across pages.
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
