"use client";

import { useEffect, useRef, useState } from "react";
import { updatePlayerHash } from "./playerHashNavigation";

type PlayerSession = {
  id: string;
  player_id: string;
  session_date: string; // YYYY-MM-DD
  title: string;
  document_upload_url: string | null;
  session_plan: string | null;
  focus_areas: string | null;
  activities: string | null;
  things_to_try: string | null;
  notes: string | null;
  published_at: string | null;
  created_at: string;
};

function getFileNameFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const raw = pathname.split("/").pop() || "session.pdf";
    return decodeURIComponent(raw);
  } catch {
    return "session.pdf";
  }
}

function isPdfUrl(url: string) {
  return /\.pdf(?:$|[?#])/i.test(url);
}

export function PlayerSessions({ 
  playerId, 
  isAdminMode,
  targetSessionId,
}: { 
  playerId: string;
  isAdminMode?: boolean;
  targetSessionId?: string | null;
}) {
  const [sessions, setSessions] = useState<PlayerSession[]>([]);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastAppliedTargetRef = useRef<string | null>(null);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      
      const endpoint = isAdminMode 
        ? `/api/admin/players/${playerId}/sessions`
        : `/api/players/${playerId}/sessions`;
      
      const res = await fetch(endpoint, {
        cache: "no-store",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to load sessions: ${res.status} - ${errorText}`);
      }
      const data = await res.json();
      // Sort by created_at descending (newest first)
      const sorted = (data.sessions ?? []).sort((a: PlayerSession, b: PlayerSession) => 
        b.created_at.localeCompare(a.created_at)
      );
      setSessions(sorted);
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
  }, [playerId, isAdminMode]);

  useEffect(() => {
    if (!targetSessionId) {
      lastAppliedTargetRef.current = null;
      return;
    }
    if (lastAppliedTargetRef.current === targetSessionId) return;

    const exists = sessions.some((session) => session.id === targetSessionId);
    if (!exists) return;

    setExpandedSessionIds((prev) => {
      const next = new Set(prev);
      next.add(targetSessionId);
      return next;
    });

    window.requestAnimationFrame(() => {
      const element = document.getElementById(`player-session-${targetSessionId}`);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    lastAppliedTargetRef.current = targetSessionId;
  }, [sessions, targetSessionId]);

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
          {sessions.map((s) => {
            const isExpanded = expandedSessionIds.has(s.id);
            const hasWrittenContent = Boolean(
              s.session_plan ||
                s.focus_areas ||
                s.activities ||
                s.things_to_try ||
                s.notes,
            );
            const hasPdf = Boolean(s.document_upload_url);
            const sessionPdfUrl = s.document_upload_url ?? "";
            const sessionPdfName = hasPdf ? getFileNameFromUrl(sessionPdfUrl) : "";
            const showPdfPreview = hasPdf && isPdfUrl(sessionPdfUrl);
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
              updatePlayerHash({
                section: "tests",
                tab: "sessions",
                sessionId: s.id,
              });
            };

            return (
              <div
                key={s.id}
                id={`player-session-${s.id}`}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
              >
                <div 
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={toggleExpanded}
                >
                  <div className="flex items-start gap-2 flex-1">
                    <svg
                      className={`w-5 h-5 text-emerald-600 shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {s.title}
                      </div>
                      <div className="text-xs text-gray-500">{s.session_date}</div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <>
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

                    {hasPdf && (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
                        <div className="text-sm font-semibold text-gray-900">
                          Session PDF
                        </div>
                        <div className="mt-1 text-xs font-medium text-gray-600">
                          {sessionPdfName}
                        </div>
                        {!hasWrittenContent && (
                          <p className="mt-2 text-sm text-gray-700">
                            This session is shared as a PDF document.
                          </p>
                        )}
                        {showPdfPreview && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-emerald-100 bg-gray-50">
                            <iframe
                              title={`Session PDF preview for ${s.title}`}
                              src={`${sessionPdfUrl}#view=FitH`}
                              className="h-[55vh] min-h-[420px] w-full bg-white lg:h-[70vh]"
                            />
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-3">
                          <a
                            href={sessionPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-emerald-700"
                          >
                            View PDF
                          </a>
                          <a
                            href={sessionPdfUrl}
                            download={sessionPdfName}
                            className="rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-base font-semibold text-emerald-800 transition hover:border-emerald-400"
                          >
                            Download PDF
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
