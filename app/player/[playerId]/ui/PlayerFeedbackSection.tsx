"use client";

import { useEffect, useMemo, useState } from "react";
import { FeedbackMarkdown } from "@/app/ui/FeedbackMarkdown";
import { formatFeedbackTitleForDisplay } from "@/lib/feedbackTitle";
import {
  parsePlayerHash,
  scrollToPlayerSection,
  updatePlayerHash,
} from "./playerHashNavigation";

type PlayerFeedback = {
  id: string;
  player_id: string | null;
  title: string;
  cleaned_markdown_content: string | null;
  created_at: string;
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function PlayerFeedbackSection({
  playerId,
  isAdminMode = false,
}: {
  playerId: string;
  isAdminMode?: boolean;
}) {
  const [feedback, setFeedback] = useState<PlayerFeedback[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetFeedbackId, setTargetFeedbackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const endpoint = isAdminMode
        ? `/api/admin/players/${playerId}/feedback`
        : `/api/players/${playerId}/feedback`;

      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as {
        feedback?: Array<
          PlayerFeedback & {
            public?: boolean;
          }
        >;
      };

      const visible = isAdminMode
        ? (data.feedback ?? []).filter((entry) => entry.public !== false)
        : (data.feedback ?? []);

      setFeedback(visible);
      setSelectedId((prev) => {
        if (
          targetFeedbackId &&
          visible.some((entry) => entry.id === targetFeedbackId)
        ) {
          return targetFeedbackId;
        }
        if (prev && visible.some((entry) => entry.id === prev)) return prev;
        return visible[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, isAdminMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyHash = () => {
      const hashState = parsePlayerHash(window.location.hash);
      setTargetFeedbackId(hashState.feedbackId);
      if (hashState.section === "feedback" || hashState.feedbackId) {
        scrollToPlayerSection("player-feedback-section");
      }
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
    };
  }, []);

  useEffect(() => {
    if (!targetFeedbackId || feedback.length === 0) return;
    const match = feedback.find((entry) => entry.id === targetFeedbackId);
    if (!match) return;
    setSelectedId(match.id);
    window.requestAnimationFrame(() => {
      const element = document.getElementById(`player-feedback-${match.id}`);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [feedback, targetFeedbackId]);

  const selected = useMemo(() => {
    if (feedback.length === 0) return null;
    if (!selectedId) return feedback[0];
    return feedback.find((entry) => entry.id === selectedId) ?? feedback[0];
  }, [feedback, selectedId]);

  return (
    <section
      id="player-feedback-section"
      className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Coach Feedback</h2>
          <p className="mt-1 text-sm text-gray-600">
            Session-by-session written feedback.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
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
        <div className="mt-4 text-sm text-gray-600">Loading feedback...</div>
      ) : feedback.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-gray-600">
          No public feedback yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-2xl border border-emerald-200 bg-white p-2">
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {feedback.map((entry) => {
                const active = selected?.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(entry.id);
                      updatePlayerHash({
                        section: "feedback",
                        feedbackId: entry.id,
                      });
                    }}
                    id={`player-feedback-${entry.id}`}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-transparent bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-900">
                      {formatFeedbackTitleForDisplay(entry.title)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {formatDateLabel(entry.created_at)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-base font-semibold text-gray-900">
                    {formatFeedbackTitleForDisplay(selected.title)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDateLabel(selected.created_at)}
                  </div>
                </div>
                <div className="feedback-markdown mt-4 text-sm leading-relaxed text-gray-800">
                  <FeedbackMarkdown
                    content={
                      selected.cleaned_markdown_content?.trim() ||
                      "No cleaned feedback available yet."
                    }
                  />
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-600">
                Select feedback from the left.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
