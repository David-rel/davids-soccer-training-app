"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { TEST_DEFINITIONS } from "@/lib/testDefinitions";
import { PinnedVideos } from "./PinnedVideos";
import { ContentSubmissionsSection } from "./ContentSubmissionsSection";

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
  set_by: "parent" | "coach";
  created_at: string;
  updated_at: string;
};

type PlayerSession = {
  id: string;
  player_id: string;
  session_date: string; // YYYY-MM-DD
  title: string;
  session_plan: string | null;
  focus_areas: string | null;
  activities: string | null;
  things_to_try: string | null;
  notes: string | null;
  admin_notes: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type PlayerVideoUpload = {
  id: string;
  player_id: string;
  video_url: string;
  description: string | null;
  status: "pending" | "reviewed";
  upload_month: string;
  coach_video_response_url: string | null;
  coach_document_response_url: string | null;
  coach_response_description: string | null;
  created_at: string;
  updated_at: string;
};

async function api<T>(
  path: string,
  opts: RequestInit & { securityCode: string },
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
    TEST_DEFINITIONS[0]?.name ?? "",
  );
  const [testDate, setTestDate] = useState<string>("");
  const [testScores, setTestScores] = useState<Record<string, string>>({});
  const [oneVOneRoundsCount, setOneVOneRoundsCount] = useState<number>(5);
  const [oneVOneRounds, setOneVOneRounds] = useState<string[]>(
    Array.from({ length: 5 }, () => ""),
  );
  const [skillMovesCount, setSkillMovesCount] = useState<number>(6);
  const [skillMovesMinCount, setSkillMovesMinCount] = useState<number>(1);
  const [skillMoves, setSkillMoves] = useState<
    Array<{ name: string; score: string }>
  >(
    Array.from({ length: 6 }, (_, i) => ({ name: `Move ${i + 1}`, score: "" })),
  );

  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);

  // Training sessions
  const [sessions, setSessions] = useState<PlayerSession[]>([]);
  const [contentSubmissions, setContentSubmissions] = useState<
    PlayerVideoUpload[]
  >([]);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(
    new Set(),
  );
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionPlan, setNewSessionPlan] = useState("");
  const [newSessionFocus, setNewSessionFocus] = useState("");
  const [newSessionActivities, setNewSessionActivities] = useState("");
  const [newSessionThingsToTry, setNewSessionThingsToTry] = useState("");
  const [newSessionNotes, setNewSessionNotes] = useState("");
  const [newSessionAdminNotes, setNewSessionAdminNotes] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState("");
  const [editSessionDate, setEditSessionDate] = useState("");
  const [editSessionPlan, setEditSessionPlan] = useState("");
  const [editSessionFocus, setEditSessionFocus] = useState("");
  const [editSessionActivities, setEditSessionActivities] = useState("");
  const [editSessionThingsToTry, setEditSessionThingsToTry] = useState("");
  const [editSessionNotes, setEditSessionNotes] = useState("");
  const [editSessionAdminNotes, setEditSessionAdminNotes] = useState("");
  const [editSessionPublished, setEditSessionPublished] = useState(false);

  const computed = useMemo(
    () => calcBirthMeta(draft?.birthdate ?? null),
    [draft?.birthdate],
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
    // Store in localStorage so child components can access it
    localStorage.setItem("adminSecurityCode", code);
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
      { method: "GET", securityCode: code },
    );
    setTests(data.tests);
  }

  async function loadProfiles(code: string, id: string) {
    const data = await api<{ profiles: PlayerProfile[] }>(
      `/api/admin/players/${id}/profiles?limit=500`,
      { method: "GET", securityCode: code },
    );
    setProfiles(data.profiles);
  }

  async function loadGoals(code: string, id: string) {
    const data = await api<{ goals: PlayerGoal[] }>(
      `/api/admin/players/${id}/goals`,
      { method: "GET", securityCode: code },
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
    // Validate date format if provided
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      setErrMsg("Date must be in YYYY-MM-DD format.");
      return;
    }
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
    patch: Partial<Pick<PlayerGoal, "name" | "due_date" | "completed">>,
  ) {
    await api<{ goal: PlayerGoal }>(
      `/api/admin/players/${playerId}/goals/${goalId}`,
      {
        method: "PATCH",
        securityCode: code,
        body: JSON.stringify(patch),
      },
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

  async function loadSessions(code: string, id: string) {
    const data = await api<{ sessions: PlayerSession[] }>(
      `/api/admin/players/${id}/sessions`,
      { method: "GET", securityCode: code },
    );
    setSessions(data.sessions ?? []);
  }

  async function loadContentSubmissions(code: string, id: string) {
    const data = await api<{ uploads: PlayerVideoUpload[] }>(
      `/api/admin/players/${id}/content`,
      { method: "GET", securityCode: code },
    );
    setContentSubmissions(data.uploads ?? []);
  }

  async function createSession(code: string, id: string) {
    const title = newSessionTitle.trim();
    if (!title) {
      setErrMsg("Session title is required.");
      return;
    }
    const date = newSessionDate.trim();
    if (!date) {
      setErrMsg("Session date is required.");
      return;
    }
    await api<{ session: PlayerSession }>(`/api/admin/players/${id}/sessions`, {
      method: "POST",
      securityCode: code,
      body: JSON.stringify({
        title,
        session_date: date,
        session_plan: newSessionPlan.trim() || null,
        focus_areas: newSessionFocus.trim() || null,
        activities: newSessionActivities.trim() || null,
        things_to_try: newSessionThingsToTry.trim() || null,
        notes: newSessionNotes.trim() || null,
        admin_notes: newSessionAdminNotes.trim() || null,
      }),
    });
    setNewSessionTitle("");
    setNewSessionDate("");
    setNewSessionPlan("");
    setNewSessionFocus("");
    setNewSessionActivities("");
    setNewSessionThingsToTry("");
    setNewSessionNotes("");
    setNewSessionAdminNotes("");
    await loadSessions(code, id);
  }

  async function saveSession(
    code: string,
    playerId: string,
    sessionId: string,
  ) {
    await api<{ session: PlayerSession }>(
      `/api/admin/players/${playerId}/sessions/${sessionId}`,
      {
        method: "PATCH",
        securityCode: code,
        body: JSON.stringify({
          title: editSessionTitle,
          session_date: editSessionDate,
          session_plan: editSessionPlan.trim() || null,
          focus_areas: editSessionFocus.trim() || null,
          activities: editSessionActivities.trim() || null,
          things_to_try: editSessionThingsToTry.trim() || null,
          notes: editSessionNotes.trim() || null,
          admin_notes: editSessionAdminNotes.trim() || null,
          published: editSessionPublished,
        }),
      },
    );
    setEditingSessionId(null);
    await loadSessions(code, playerId);
  }

  async function deleteSession(
    code: string,
    playerId: string,
    sessionId: string,
  ) {
    await api<{ ok: true }>(
      `/api/admin/players/${playerId}/sessions/${sessionId}`,
      {
        method: "DELETE",
        securityCode: code,
      },
    );
    await loadSessions(code, playerId);
  }

  async function togglePublishSession(
    code: string,
    playerId: string,
    sessionId: string,
    currentPublished: boolean,
  ) {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // Toggle published status
    setEditSessionPublished(!currentPublished);
    setEditSessionTitle(session.title);
    setEditSessionDate(session.session_date);
    setEditSessionPlan(session.session_plan ?? "");
    setEditSessionFocus(session.focus_areas ?? "");
    setEditSessionActivities(session.activities ?? "");
    setEditSessionThingsToTry(session.things_to_try ?? "");
    setEditSessionNotes(session.notes ?? "");
    setEditSessionAdminNotes(session.admin_notes ?? "");
    setEditSessionPublished(!currentPublished);

    await api<{ session: PlayerSession }>(
      `/api/admin/players/${playerId}/sessions/${sessionId}`,
      {
        method: "PATCH",
        securityCode: code,
        body: JSON.stringify({
          title: session.title,
          session_date: session.session_date,
          session_plan: session.session_plan,
          focus_areas: session.focus_areas,
          activities: session.activities,
          things_to_try: session.things_to_try,
          notes: session.notes,
          admin_notes: session.admin_notes,
          published: !currentPublished,
        }),
      },
    );
    await loadSessions(code, playerId);
  }

  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editTestName, setEditTestName] = useState<string>("");
  const [editTestDate, setEditTestDate] = useState<string>("");
  const [editTestScores, setEditTestScores] = useState<Record<string, string>>(
    {},
  );
  const [editOneVOneRoundsCount, setEditOneVOneRoundsCount] =
    useState<number>(5);
  const [editOneVOneRounds, setEditOneVOneRounds] = useState<string[]>(
    Array.from({ length: 5 }, () => ""),
  );
  const [editSkillMovesCount, setEditSkillMovesCount] = useState<number>(6);
  const [editSkillMoves, setEditSkillMoves] = useState<
    Array<{ name: string; score: string }>
  >(
    Array.from({ length: 6 }, (_, i) => ({ name: `Move ${i + 1}`, score: "" })),
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
        make(arr.length + i),
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
        })),
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
                x !== null,
            )
            .sort((a, b) => a.idx - b.idx)
            .map(({ name, score }) => ({ name, score }));

      const count = moves.length ? moves.length : 6;
      setEditSkillMovesCount(count);
      setEditSkillMoves(
        resizeArray(moves, count, (i) => ({
          name: `Move ${i + 1}`,
          score: "",
        })),
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
      },
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
      },
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
      { method: "DELETE", securityCode },
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
            {authorized && playerId && (
              <Link
                href={`/admin/player/${playerId}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                title="View as parent sees it"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Preview Parent View
                </span>
              </Link>
            )}
            {authorized && (
              <button
                type="button"
                onClick={() => {
                  setAuthorized(false);
                  setSecurityCode("");
                  setPlayer(null);
                  setDraft(null);
                  localStorage.removeItem("adminSecurityCode");
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
                    await loadSessions(securityCode, playerId);
                    await loadContentSubmissions(securityCode, playerId);
                  } catch (e) {
                    setAuthError(
                      e instanceof Error ? e.message : "Unauthorized",
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
                      await loadSessions(securityCode, playerId);
                      await loadContentSubmissions(securityCode, playerId);
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

              {/* Profile Picture Display */}
              {draft.profile_photo_url && (
                <div className="mt-6 flex items-center gap-4">
                  <Image
                    src={draft.profile_photo_url}
                    alt={draft.name}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover border-2 border-emerald-200"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Profile Picture</div>
                    <div className="text-xs text-gray-500 mt-1">Update URL below to change</div>
                  </div>
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
                              : "Failed to add goal.",
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
                                                { completed: next },
                                              );
                                            } catch (e2) {
                                              setErrMsg(
                                                e2 instanceof Error
                                                  ? e2.message
                                                  : "Failed to update goal.",
                                              );
                                            }
                                          });
                                        }}
                                        className="mt-1 h-4 w-4 accent-emerald-600"
                                      />
                                      <div className="min-w-[240px] flex-1">
                                        <div className="mb-2">
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
                                        </div>
                                        <div className="flex items-center gap-2">
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
                                            className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                          />
                                          <span
                                            className={`rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap ${
                                              g.set_by === "coach"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-gray-100 text-gray-700"
                                            }`}
                                          >
                                            {g.set_by === "coach"
                                              ? "Set by coach"
                                              : "Set by parent"}
                                          </span>
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
                                                },
                                              );
                                              setMsg("Goal saved.");
                                            } catch (e2) {
                                              setErrMsg(
                                                e2 instanceof Error
                                                  ? e2.message
                                                  : "Failed to save goal.",
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
                                              `Delete goal "${g.name}"?`,
                                            )
                                          ) {
                                            setMsg(null);
                                            setErrMsg(null);
                                            startTransition(async () => {
                                              try {
                                                await deleteGoal(
                                                  securityCode,
                                                  playerId,
                                                  g.id,
                                                );
                                                setMsg("Goal deleted.");
                                              } catch (e2) {
                                                setErrMsg(
                                                  e2 instanceof Error
                                                    ? e2.message
                                                    : "Failed to delete goal.",
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
                                              { completed: next },
                                            );
                                          } catch (e2) {
                                            setErrMsg(
                                              e2 instanceof Error
                                                ? e2.message
                                                : "Failed to update goal.",
                                            );
                                          }
                                        });
                                      }}
                                      className="h-4 w-4 accent-emerald-600"
                                    />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm font-semibold text-gray-900 line-through">
                                          {g.name}
                                        </div>
                                        <span
                                          className={`rounded-lg px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                            g.set_by === "coach"
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-gray-100 text-gray-700"
                                          }`}
                                        >
                                          {g.set_by === "coach"
                                            ? "Set by coach"
                                            : "Set by parent"}
                                        </span>
                                      </div>
                                      <div className="mt-0.5 text-xs text-gray-600">
                                        {g.completed_at
                                          ? `Completed ${new Date(
                                              g.completed_at,
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
                                          `Delete completed goal "${g.name}"?`,
                                        )
                                      ) {
                                        startTransition(async () => {
                                          try {
                                            await deleteGoal(
                                              securityCode,
                                              playerId,
                                              g.id,
                                            );
                                          } catch (e2) {
                                            setErrMsg(
                                              e2 instanceof Error
                                                ? e2.message
                                                : "Failed to delete goal.",
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

              <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="text-sm font-semibold text-gray-900">
                  Training sessions
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Record training sessions and publish them to parents.
                </p>

                <div className="mt-4 grid gap-4">
                  <Field
                    label="Session title"
                    value={newSessionTitle}
                    onChange={setNewSessionTitle}
                    placeholder="e.g., Pre-Game Prep"
                  />
                  <Field
                    label="Session date"
                    value={newSessionDate}
                    onChange={setNewSessionDate}
                    type="date"
                  />
                  <TextArea
                    label="Session plan"
                    value={newSessionPlan}
                    onChange={setNewSessionPlan}
                    placeholder="What was planned for the session..."
                  />
                  <TextArea
                    label="Focus areas"
                    value={newSessionFocus}
                    onChange={setNewSessionFocus}
                    placeholder="Primary focus of the session..."
                  />
                  <TextArea
                    label="Activities"
                    value={newSessionActivities}
                    onChange={setNewSessionActivities}
                    placeholder="What was actually worked on..."
                  />
                  <TextArea
                    label="Things to try"
                    value={newSessionThingsToTry}
                    onChange={setNewSessionThingsToTry}
                    placeholder="New techniques or skills to practice..."
                  />
                  <TextArea
                    label="Notes"
                    value={newSessionNotes}
                    onChange={setNewSessionNotes}
                    placeholder="General notes about the session..."
                  />
                  <TextArea
                    label="Admin notes (private)"
                    value={newSessionAdminNotes}
                    onChange={setNewSessionAdminNotes}
                    placeholder="Your private coaching observations (never visible to parents)..."
                  />

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          if (!playerId) return;
                          await createSession(securityCode, playerId);
                          setMsg("Session created.");
                        } catch (e) {
                          setErrMsg(
                            e instanceof Error
                              ? e.message
                              : "Failed to create session.",
                          );
                        }
                      });
                    }}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
                  >
                    Save session
                  </button>
                </div>

                {sessions.length > 0 && (
                  <div className="mt-5 border-t border-emerald-200 pt-4">
                    <div className="text-xs font-semibold text-gray-900">
                      All sessions
                    </div>
                    <div className="mt-3 grid gap-2">
                      {sessions
                        .slice()
                        .sort((a, b) => {
                          // Sort by date descending (newest first)
                          if (a.session_date !== b.session_date) {
                            return b.session_date.localeCompare(a.session_date);
                          }
                          // If same date, sort by created_at descending
                          return b.created_at.localeCompare(a.created_at);
                        })
                        .map((s) => {
                          const isExpanded = expandedSessionIds.has(s.id);
                          const toggleExpanded = () => {
                            setExpandedSessionIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(s.id)) {
                                next.delete(s.id);
                              } else {
                                next.add(s.id);
                              }
                              return next;
                            });
                          };

                          return (
                            <div
                              key={s.id}
                              className="rounded-2xl border border-emerald-200 bg-white px-4 py-3"
                            >
                              {editingSessionId === s.id ? (
                                <div className="space-y-3">
                                  <Field
                                    label="Session title"
                                    value={editSessionTitle}
                                    onChange={setEditSessionTitle}
                                  />
                                  <Field
                                    label="Session date"
                                    value={editSessionDate}
                                    onChange={setEditSessionDate}
                                    type="date"
                                  />
                                  <TextArea
                                    label="Session plan"
                                    value={editSessionPlan}
                                    onChange={setEditSessionPlan}
                                  />
                                  <TextArea
                                    label="Focus areas"
                                    value={editSessionFocus}
                                    onChange={setEditSessionFocus}
                                  />
                                  <TextArea
                                    label="Activities"
                                    value={editSessionActivities}
                                    onChange={setEditSessionActivities}
                                  />
                                  <TextArea
                                    label="Things to try"
                                    value={editSessionThingsToTry}
                                    onChange={setEditSessionThingsToTry}
                                  />
                                  <TextArea
                                    label="Notes"
                                    value={editSessionNotes}
                                    onChange={setEditSessionNotes}
                                  />
                                  <TextArea
                                    label="Admin notes (private)"
                                    value={editSessionAdminNotes}
                                    onChange={setEditSessionAdminNotes}
                                  />

                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={editSessionPublished}
                                      onChange={(e) =>
                                        setEditSessionPublished(
                                          e.target.checked,
                                        )
                                      }
                                      className="h-4 w-4 rounded border-emerald-200"
                                    />
                                    <label className="text-sm font-medium text-gray-700">
                                      Published (visible to parents)
                                    </label>
                                  </div>

                                  <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingSessionId(null)}
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
                                            if (!playerId) return;
                                            await saveSession(
                                              securityCode,
                                              playerId,
                                              s.id,
                                            );
                                            setMsg("Session updated.");
                                          } catch (e) {
                                            setErrMsg(
                                              e instanceof Error
                                                ? e.message
                                                : "Failed to update session.",
                                            );
                                          }
                                        });
                                      }}
                                      className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div
                                    className="flex items-start justify-between gap-3 cursor-pointer"
                                    onClick={toggleExpanded}
                                  >
                                    <div className="flex items-start gap-2 flex-1">
                                      <svg
                                        className={`w-5 h-5 text-emerald-600 shrink-0 mt-0.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 5l7 7-7 7"
                                        />
                                      </svg>
                                      <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {s.title}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {s.session_date}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {s.published ? (
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                          Published
                                        </span>
                                      ) : (
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                          Draft
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <>
                                      {s.session_plan && (
                                        <div className="mt-2">
                                          <div className="text-xs font-semibold text-gray-900">
                                            Session plan
                                          </div>
                                          <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                                            {s.session_plan}
                                          </div>
                                        </div>
                                      )}

                                      {s.focus_areas && (
                                        <div className="mt-2">
                                          <div className="text-xs font-semibold text-gray-900">
                                            Focus areas
                                          </div>
                                          <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                                            {s.focus_areas}
                                          </div>
                                        </div>
                                      )}

                                      {s.activities && (
                                        <div className="mt-2">
                                          <div className="text-xs font-semibold text-gray-900">
                                            Activities
                                          </div>
                                          <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                                            {s.activities}
                                          </div>
                                        </div>
                                      )}

                                      {s.things_to_try && (
                                        <div className="mt-2">
                                          <div className="text-xs font-semibold text-gray-900">
                                            Things to try
                                          </div>
                                          <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                                            {s.things_to_try}
                                          </div>
                                        </div>
                                      )}

                                      {s.notes && (
                                        <div className="mt-2">
                                          <div className="text-xs font-semibold text-gray-900">
                                            Notes
                                          </div>
                                          <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                                            {s.notes}
                                          </div>
                                        </div>
                                      )}

                                      {s.admin_notes && (
                                        <div className="mt-2">
                                          <div className="text-xs font-semibold text-gray-900">
                                            Admin notes (private)
                                          </div>
                                          <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                                            {s.admin_notes}
                                          </div>
                                        </div>
                                      )}

                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          disabled={isPending}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startTransition(async () => {
                                              try {
                                                if (!playerId) return;
                                                await togglePublishSession(
                                                  securityCode,
                                                  playerId,
                                                  s.id,
                                                  s.published,
                                                );
                                                setMsg(
                                                  s.published
                                                    ? "Session unpublished."
                                                    : "Session published.",
                                                );
                                              } catch (e) {
                                                setErrMsg(
                                                  e instanceof Error
                                                    ? e.message
                                                    : "Failed to update session.",
                                                );
                                              }
                                            });
                                          }}
                                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                                            s.published
                                              ? "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
                                          }`}
                                        >
                                          {s.published
                                            ? "Unpublish"
                                            : "Publish"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingSessionId(s.id);
                                            setEditSessionTitle(s.title);
                                            setEditSessionDate(s.session_date);
                                            setEditSessionPlan(
                                              s.session_plan ?? "",
                                            );
                                            setEditSessionFocus(
                                              s.focus_areas ?? "",
                                            );
                                            setEditSessionActivities(
                                              s.activities ?? "",
                                            );
                                            setEditSessionThingsToTry(
                                              s.things_to_try ?? "",
                                            );
                                            setEditSessionNotes(s.notes ?? "");
                                            setEditSessionAdminNotes(
                                              s.admin_notes ?? "",
                                            );
                                            setEditSessionPublished(
                                              s.published,
                                            );
                                          }}
                                          className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isPending}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (
                                              !confirm(
                                                "Are you sure you want to delete this session?",
                                              )
                                            )
                                              return;
                                            startTransition(async () => {
                                              try {
                                                if (!playerId) return;
                                                await deleteSession(
                                                  securityCode,
                                                  playerId,
                                                  s.id,
                                                );
                                                setMsg("Session deleted.");
                                              } catch (e) {
                                                setErrMsg(
                                                  e instanceof Error
                                                    ? e.message
                                                    : "Failed to delete session.",
                                                );
                                              }
                                            });
                                          }}
                                          className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 disabled:opacity-50"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
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
                          },
                        );
                        setPlayer(data.player);
                        setDraft(data.player);
                        setMsg("Saved.");
                      } catch (e) {
                        setErrMsg(
                          e instanceof Error ? e.message : "Save failed.",
                        );
                      }
                    });
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? "Saving…" : "Save changes"}
                </button>
              </div>

              <div className="mt-8">
                <PinnedVideos playerId={playerId ?? ""} />
              </div>

              <div className="mt-8">
                <ContentSubmissionsSection
                  playerId={playerId ?? ""}
                  submissions={contentSubmissions}
                  securityCode={securityCode}
                  onReload={async () => {
                    if (!playerId) return;
                    await loadPlayer(securityCode, playerId);
                    await loadTests(securityCode, playerId);
                    await loadProfiles(securityCode, playerId);
                    await loadGoals(securityCode, playerId);
                    await loadSessions(securityCode, playerId);
                    await loadContentSubmissions(securityCode, playerId);
                  }}
                />
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
                          // Collect ALL unique move names and their most recent scores
                          const allSkillMovesTests = tests
                            .filter((t) => t.test_name === "Skill Moves")
                            .sort((a, b) => {
                              if (a.test_date !== b.test_date) {
                                return b.test_date.localeCompare(a.test_date);
                              }
                              return b.created_at.localeCompare(a.created_at);
                            });

                          if (allSkillMovesTests.length > 0) {
                            // Build a map of move name -> most recent score
                            const moveScoresMap = new Map<string, string>();

                            // Process tests from newest to oldest, so earlier iterations set the most recent scores
                            for (const test of allSkillMovesTests) {
                              const scores = test.scores ?? {};
                              const movesRaw = (scores as { moves?: unknown })
                                .moves;

                              if (Array.isArray(movesRaw)) {
                                movesRaw.forEach((m) => {
                                  const obj = (m ?? {}) as Record<
                                    string,
                                    unknown
                                  >;
                                  const name = String(obj.name ?? "").trim();
                                  if (name && !moveScoresMap.has(name)) {
                                    // First time seeing this move (most recent)
                                    const score =
                                      obj.score === null ||
                                      obj.score === undefined
                                        ? ""
                                        : String(obj.score);
                                    moveScoresMap.set(name, score);
                                  }
                                });
                              } else {
                                // Legacy format
                                Object.entries(scores).forEach(([k, v]) => {
                                  const m = /^skillmove_name_(\d+)$/.exec(k);
                                  if (m) {
                                    const name = String(v ?? "").trim();
                                    if (name && !moveScoresMap.has(name)) {
                                      const idx = Number(m[1]);
                                      const scoreKey = `skillmove_${idx}`;
                                      const score =
                                        scores[scoreKey] === null ||
                                        scores[scoreKey] === undefined
                                          ? ""
                                          : String(scores[scoreKey]);
                                      moveScoresMap.set(name, score);
                                    }
                                  }
                                });
                              }
                            }

                            // Convert to array
                            const movesWithScores = Array.from(
                              moveScoresMap.entries(),
                            ).map(([name, score]) => ({
                              name,
                              score,
                            }));

                            const minCount = movesWithScores.length; // Can't have fewer than existing moves
                            const count = Math.max(
                              6,
                              movesWithScores.length + 2,
                            );

                            setSkillMovesMinCount(minCount);
                            setSkillMovesCount(count);
                            setSkillMoves([
                              ...movesWithScores,
                              ...Array.from(
                                { length: count - movesWithScores.length },
                                (_, i) => ({
                                  name: `Move ${movesWithScores.length + i + 1}`,
                                  score: "",
                                }),
                              ),
                            ]);
                          } else {
                            // No previous test - use default blank moves
                            setSkillMovesMinCount(1);
                            setSkillMovesCount(6);
                            setSkillMoves(
                              Array.from({ length: 6 }, (_, i) => ({
                                name: `Move ${i + 1}`,
                                score: "",
                              })),
                            );
                          }
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
                                  5,
                                );
                                setOneVOneRoundsCount(next);
                                setOneVOneRounds((prev) =>
                                  resizeArray(prev, next, () => ""),
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
                                      idx === i ? e.target.value : x,
                                    ),
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
                            <select
                              value={String(skillMovesCount)}
                              onChange={(e) => {
                                const next = Number(e.target.value);
                                setSkillMovesCount(next);
                                setSkillMoves((prev) =>
                                  resizeArray(prev, next, (i) => ({
                                    name: `Move ${i + 1}`,
                                    score: "",
                                  })),
                                );
                              }}
                              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                            >
                              {Array.from(
                                { length: 51 - skillMovesMinCount },
                                (_, i) => skillMovesMinCount + i,
                              ).map((num) => (
                                <option key={num} value={num}>
                                  {num}
                                </option>
                              ))}
                            </select>
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
                                        : x,
                                    ),
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
                                        : x,
                                    ),
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
                            },
                          );

                          setTestScores({});
                          setOneVOneRounds(Array.from({ length: 5 }, () => ""));
                          setOneVOneRoundsCount(5);
                          setSkillMoves(
                            Array.from({ length: 6 }, (_, i) => ({
                              name: `Move ${i + 1}`,
                              score: "",
                            })),
                          );
                          setSkillMovesCount(6);
                          await loadTests(securityCode, playerId);
                          setMsg("Test saved.");
                        } catch (e) {
                          setErrMsg(
                            e instanceof Error
                              ? e.message
                              : "Failed to save test.",
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
                                  (s as { rounds?: unknown }).rounds,
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
                                    `Delete test "${t.test_name}" on ${t.test_date}?`,
                                  )
                                ) {
                                  startTransition(async () => {
                                    try {
                                      await deleteTest(t.id);
                                    } catch (e) {
                                      setErrMsg(
                                        e instanceof Error
                                          ? e.message
                                          : "Failed to delete test.",
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
                                          Array.from({ length: 5 }, () => ""),
                                        );
                                      }
                                      if (next === "Skill Moves") {
                                        setEditSkillMovesCount(6);
                                        setEditSkillMoves(
                                          Array.from({ length: 6 }, (_, i) => ({
                                            name: `Move ${i + 1}`,
                                            score: "",
                                          })),
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
                                              editOneVOneRoundsCount,
                                            )}
                                            onChange={(e) => {
                                              const next = clampCount(
                                                e.target.value,
                                                1,
                                                50,
                                                5,
                                              );
                                              setEditOneVOneRoundsCount(next);
                                              setEditOneVOneRounds((prev) =>
                                                resizeArray(
                                                  prev,
                                                  next,
                                                  () => "",
                                                ),
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
                                                      : x,
                                                  ),
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
                                          <select
                                            value={String(editSkillMovesCount)}
                                            onChange={(e) => {
                                              const next = Number(
                                                e.target.value,
                                              );
                                              setEditSkillMovesCount(next);
                                              setEditSkillMoves((prev) =>
                                                resizeArray(
                                                  prev,
                                                  next,
                                                  (i) => ({
                                                    name: `Move ${i + 1}`,
                                                    score: "",
                                                  }),
                                                ),
                                              );
                                            }}
                                            className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                                          >
                                            {Array.from(
                                              { length: 50 },
                                              (_, i) => i + 1,
                                            ).map((num) => (
                                              <option key={num} value={num}>
                                                {num}
                                              </option>
                                            ))}
                                          </select>
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
                                                      : x,
                                                  ),
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
                                                      : x,
                                                  ),
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
                                          (td) => td.name === editTestName,
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
                                              : "Failed to update test.",
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
                            },
                          );
                          await loadProfiles(securityCode, playerId);
                          setMsg("Profile recomputed.");
                        } catch (e) {
                          setErrMsg(
                            e instanceof Error
                              ? e.message
                              : "Failed to recompute profile.",
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
                                            : "Failed to update profile.",
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
                                        `Delete profile snapshot "${p.name}"?`,
                                      )
                                    ) {
                                      startTransition(async () => {
                                        try {
                                          await deleteProfile(p.id);
                                        } catch (e) {
                                          setErrMsg(
                                            e instanceof Error
                                              ? e.message
                                              : "Failed to delete profile.",
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
