"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";

type SessionDetail = {
  id: string;
  session_date: string;
  title: string | null;
  focus_areas: string | null;
  notes: string | null;
  things_to_try: string | null;
};

export function PlayerSessions({ playerId }: { playerId: string }) {
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/players/${playerId}/sessions`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSessions(data);
      })
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-sm text-gray-600">
        No sessions recorded yet. Session notes are added by Coach David after
        your training.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const isExpanded = expanded === s.id;
        const date = new Date(s.session_date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const hasDetails = s.focus_areas || s.notes || s.things_to_try;

        return (
          <div
            key={s.id}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() =>
                hasDetails
                  ? setExpanded(isExpanded ? null : s.id)
                  : undefined
              }
              className={`flex w-full items-center gap-4 p-4 text-left transition ${
                hasDetails ? "hover:bg-gray-50" : "cursor-default"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                <CalendarDays className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-gray-900">
                  {s.title || "Training Session"}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">{date}</div>
              </div>
              {hasDetails && (
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              )}
            </button>

            {isExpanded && hasDetails && (
              <div className="space-y-3 border-t border-gray-100 px-4 pb-4 pt-3 text-sm text-gray-700">
                {s.focus_areas && (
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Focus Areas
                    </div>
                    <p className="leading-relaxed">{s.focus_areas}</p>
                  </div>
                )}
                {s.things_to_try && (
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Things to Try
                    </div>
                    <p className="leading-relaxed">{s.things_to_try}</p>
                  </div>
                )}
                {s.notes && (
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Notes
                    </div>
                    <p className="leading-relaxed">{s.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
