"use client";

import { useEffect, useState } from "react";

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
  published_at: string | null;
  created_at: string;
};

export function PlayerSessions({ playerId }: { playerId: string }) {
  const [sessions, setSessions] = useState<PlayerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/players/${playerId}/sessions`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to load sessions: ${res.status} - ${errorText}`);
      }
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
      console.error("Error loading sessions:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">
            Training Sessions
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Recent sessions with Coach David.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-4 text-sm text-gray-600">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-gray-600">
          No published training sessions yet. Check back after your next session with Coach David!
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900">
                  {s.title}
                </div>
                <div className="text-xs text-gray-500">{s.session_date}</div>
              </div>

              {s.session_plan && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-900">
                    Session plan
                  </div>
                  <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                    {s.session_plan}
                  </div>
                </div>
              )}

              {s.focus_areas && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-900">
                    Focus areas
                  </div>
                  <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                    {s.focus_areas}
                  </div>
                </div>
              )}

              {s.activities && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-900">
                    What we worked on
                  </div>
                  <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                    {s.activities}
                  </div>
                </div>
              )}

              {s.things_to_try && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-900">
                    Things to try
                  </div>
                  <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                    {s.things_to_try}
                  </div>
                </div>
              )}

              {s.notes && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-900">
                    Notes
                  </div>
                  <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                    {s.notes}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
