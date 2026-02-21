"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type PlayerGoal = {
  id: string;
  player_id: string;
  name: string;
  due_date: string | null; // YYYY-MM-DD
  completed: boolean;
  completed_at: string | null;
  set_by: 'parent' | 'coach';
  created_at: string;
  updated_at: string;
};

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function PlayerGoals({ 
  playerId,
  isAdminMode
}: { 
  playerId: string;
  isAdminMode?: boolean;
}) {
  const [goals, setGoals] = useState<PlayerGoal[]>([]);
  const [goalDrafts, setGoalDrafts] = useState<
    Record<string, { name: string; due_date: string }>
  >({});
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDueDate, setNewGoalDueDate] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function load() {
    const endpoint = isAdminMode 
      ? `/api/admin/players/${playerId}/goals`
      : `/api/players/${playerId}/goals`;
    
    const data = await jsonFetch<{ goals: PlayerGoal[] }>(endpoint);
    setGoals(data.goals ?? []);
    setGoalDrafts((prev) => {
      const next = { ...prev };
      for (const g of data.goals ?? []) {
        if (!next[g.id])
          next[g.id] = { name: g.name, due_date: g.due_date ?? "" };
      }
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        // keep quiet; page will still render coach notes
      }
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, isAdminMode]);

  const { todo, done } = useMemo(() => {
    const t = goals.filter((g) => !g.completed);
    const d = goals.filter((g) => g.completed);
    return { todo: t, done: d };
  }, [goals]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">Goals</div>
          <p className="mt-1 text-sm text-gray-600">
            Track what to work on and mark goals complete.
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setMsg(null);
            setErrMsg(null);
            startTransition(async () => {
              try {
                await load();
                setMsg("Refreshed.");
              } catch (e) {
                setErrMsg(
                  e instanceof Error ? e.message : "Failed to refresh goals."
                );
              }
            });
          }}
          className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {(errMsg || msg) && (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            errMsg
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {errMsg ?? msg}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <input
          value={newGoalName}
          onChange={(e) => setNewGoalName(e.target.value)}
          placeholder="New goal"
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
            setMsg(null);
            setErrMsg(null);
            startTransition(async () => {
              try {
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
                await jsonFetch<{ goal: PlayerGoal }>(
                  `/api/players/${playerId}/goals`,
                  {
                    method: "POST",
                    body: JSON.stringify({ name, due_date: due || null }),
                  }
                );
                setNewGoalName("");
                setNewGoalDueDate("");
                await load();
                setMsg("Goal added.");
              } catch (e) {
                setErrMsg(
                  e instanceof Error ? e.message : "Failed to add goal."
                );
              }
            });
          }}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Add goal
        </button>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <div className="text-xs font-semibold text-gray-900">To do</div>
          <div className="mt-2 grid gap-2">
            {todo.length === 0 ? (
              <div className="text-sm text-gray-600">No active goals yet.</div>
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
                            const next = e.target.checked;
                            startTransition(async () => {
                              try {
                                await jsonFetch<{ goal: PlayerGoal }>(
                                  `/api/players/${playerId}/goals/${g.id}`,
                                  {
                                    method: "PATCH",
                                    body: JSON.stringify({ completed: next }),
                                  }
                                );
                                await load();
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
                        <div className="min-w-[220px] flex-1">
                          <div className="mb-2">
                            <input
                              value={g.set_by === 'coach' ? g.name : d.name}
                              onChange={(e) =>
                                g.set_by !== 'coach' &&
                                setGoalDrafts((prev) => ({
                                  ...prev,
                                  [g.id]: { ...d, name: e.target.value },
                                }))
                              }
                              disabled={g.set_by === 'coach'}
                              readOnly={g.set_by === 'coach'}
                              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              value={g.set_by === 'coach' ? (g.due_date ?? '') : d.due_date}
                              onChange={(e) =>
                                g.set_by !== 'coach' &&
                                setGoalDrafts((prev) => ({
                                  ...prev,
                                  [g.id]: { ...d, due_date: e.target.value },
                                }))
                              }
                              type="date"
                              disabled={g.set_by === 'coach'}
                              readOnly={g.set_by === 'coach'}
                              className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed"
                            />
                            <span
                              className={`rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap ${
                                g.set_by === 'coach'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {g.set_by === 'coach' ? 'Set by coach' : 'Set by self'}
                            </span>
                          </div>
                        </div>
                      </label>

                      {g.set_by !== 'coach' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setMsg(null);
                              setErrMsg(null);
                              startTransition(async () => {
                                try {
                                  await jsonFetch<{ goal: PlayerGoal }>(
                                    `/api/players/${playerId}/goals/${g.id}`,
                                    {
                                      method: "PATCH",
                                      body: JSON.stringify({
                                        name: d.name.trim(),
                                        due_date: d.due_date || null,
                                      }),
                                    }
                                  );
                                  await load();
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
                              if (window.confirm(`Delete goal "${g.name}"?`)) {
                                setMsg(null);
                                setErrMsg(null);
                                startTransition(async () => {
                                  try {
                                    await jsonFetch<{ ok: true }>(
                                      `/api/players/${playerId}/goals/${g.id}`,
                                      { method: "DELETE" }
                                    );
                                    await load();
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
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-900">Completed</div>
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
                          const next = e.target.checked;
                          startTransition(async () => {
                            try {
                              await jsonFetch<{ goal: PlayerGoal }>(
                                `/api/players/${playerId}/goals/${g.id}`,
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({ completed: next }),
                                }
                              );
                              await load();
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
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-900 line-through">
                            {g.name}
                          </div>
                          <span
                            className={`rounded-lg px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                              g.set_by === 'coach'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {g.set_by === 'coach' ? 'Set by coach' : 'Set by self'}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-gray-600">
                          {g.completed_at
                            ? `Completed ${new Date(
                                g.completed_at
                              ).toLocaleDateString()}`
                            : "Completed"}
                          {g.due_date ? ` • Due ${g.due_date}` : ""}
                        </div>
                      </div>
                    </label>
                    {g.set_by !== 'coach' && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (
                            window.confirm(`Delete completed goal "${g.name}"?`)
                          ) {
                            startTransition(async () => {
                              try {
                                await jsonFetch<{ ok: true }>(
                                  `/api/players/${playerId}/goals/${g.id}`,
                                  { method: "DELETE" }
                                );
                                await load();
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
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
