"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Trophy } from "lucide-react";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  is_youtube: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  submission_count: number;
};

type Submission = {
  id: string;
  challenge_id: string;
  player_id: string;
  video_url: string;
  is_youtube: boolean;
  notes: string | null;
  public: boolean;
  status: string;
  seen_at: string | null;
  created_at: string;
  player_name: string;
};

function extractYoutubeId(url: string): string | null {
  return url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)?.[1] ?? null;
}

async function api<T>(
  path: string,
  opts: RequestInit & { securityCode?: string }
): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.securityCode ? { "x-security-code": opts.securityCode } : {}),
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

function SecurityGate({
  onAuth,
}: {
  onAuth: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api<{ ok: true }>("/api/admin/verify", {
        method: "GET",
        securityCode: code,
      });
      onAuth(code);
    } catch {
      setError("Invalid security code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Security Code Required</h2>
      <form onSubmit={(e) => { void submit(e); }} className="mt-4 space-y-3">
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter security code"
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

function SubmissionsPanel({
  challenge,
  securityCode,
}: {
  challenge: Challenge;
  securityCode: string;
}) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ submissions: Submission[] }>(
      `/api/admin/challenges/${challenge.id}/submissions`,
      { method: "GET", securityCode }
    )
      .then((d) => setSubmissions(d.submissions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [challenge.id, securityCode]);

  async function markSeen(submissionId: string) {
    try {
      await api(
        `/api/admin/challenges/${challenge.id}/submissions/${submissionId}`,
        {
          method: "PATCH",
          securityCode,
          body: JSON.stringify({ status: "seen" }),
        }
      );
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...s, status: "seen", seen_at: new Date().toISOString() }
            : s
        )
      );
    } catch {
      // ignore
    }
  }

  if (loading) return <div className="py-4 text-center text-sm text-gray-400">Loading submissions…</div>;
  if (submissions.length === 0)
    return <div className="py-4 text-center text-sm text-gray-400">No submissions yet.</div>;

  return (
    <div className="space-y-3">
      {submissions.map((s) => {
        const ytId = s.is_youtube ? extractYoutubeId(s.video_url) : null;
        return (
          <div
            key={s.id}
            className="rounded-2xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium text-sm text-gray-900">{s.player_name}</div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    s.status === "seen"
                      ? "bg-gray-100 text-gray-600"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {s.status === "seen" ? "Seen" : "New"}
                </span>
                {s.public && (
                  <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                    Public
                  </span>
                )}
              </div>
            </div>

            {ytId ? (
              <div className="mt-3 aspect-video overflow-hidden rounded-xl bg-gray-900">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  className="h-full w-full"
                  allowFullScreen
                  title={`${s.player_name} submission`}
                />
              </div>
            ) : (
              <a
                href={s.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-sm text-violet-600 underline"
              >
                View submission video
              </a>
            )}

            {s.notes && (
              <p className="mt-2 text-sm text-gray-600 italic">{s.notes}</p>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {new Date(s.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {s.status !== "seen" && (
                <button
                  type="button"
                  onClick={() => void markSeen(s.id)}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  Mark Seen
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChallengeRow({
  challenge,
  securityCode,
  onDeleted,
  onUpdated,
}: {
  challenge: Challenge;
  securityCode: string;
  onDeleted: (id: string) => void;
  onUpdated: (c: Challenge) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(challenge.title);
  const [description, setDescription] = useState(challenge.description ?? "");
  const [videoUrl, setVideoUrl] = useState(challenge.video_url);
  const [isYoutube, setIsYoutube] = useState(challenge.is_youtube);
  const [active, setActive] = useState(challenge.active);
  const [error, setError] = useState<string | null>(null);

  async function saveEdit() {
    setError(null);
    try {
      const data = await api<{ challenge: Challenge }>(
        `/api/admin/challenges/${challenge.id}`,
        {
          method: "PATCH",
          securityCode,
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            video_url: videoUrl.trim(),
            is_youtube: isYoutube,
            active,
          }),
        }
      );
      onUpdated(data.challenge);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete challenge "${challenge.title}"? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/challenges/${challenge.id}`, {
        method: "DELETE",
        securityCode,
      });
      onDeleted(challenge.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-white overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{challenge.title}</span>
            {!challenge.active && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                Inactive
              </span>
            )}
            {challenge.is_youtube && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-700">
                YouTube
              </span>
            )}
          </div>
          {challenge.description && (
            <p className="mt-1 text-sm text-gray-500 truncate">{challenge.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            {challenge.submission_count} submission{challenge.submission_count !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-300"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {editing && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-50"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-50"
          />
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Video URL"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-50"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isYoutube}
                onChange={(e) => setIsYoutube(e.target.checked)}
                className="rounded"
              />
              Is YouTube
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded"
              />
              Active
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await saveEdit();
                });
              }}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Submissions ({challenge.submission_count})
          </h4>
          <SubmissionsPanel challenge={challenge} securityCode={securityCode} />
        </div>
      )}
    </div>
  );
}

export default function AdminChallengesClient() {
  const [securityCode, setSecurityCode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // New challenge form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newIsYoutube, setNewIsYoutube] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function loadChallenges(code: string) {
    setLoading(true);
    try {
      const data = await api<{ challenges: Challenge[] }>(
        "/api/admin/challenges",
        { method: "GET", securityCode: code }
      );
      setChallenges(data.challenges);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  function onAuth(code: string) {
    setSecurityCode(code);
    setAuthorized(true);
    void loadChallenges(code);
  }

  async function handleCreate() {
    setCreateError(null);
    if (!newTitle.trim()) { setCreateError("Title is required."); return; }
    if (!newVideoUrl.trim()) { setCreateError("Video URL is required."); return; }
    try {
      const data = await api<{ challenge: Challenge }>(
        "/api/admin/challenges",
        {
          method: "POST",
          securityCode,
          body: JSON.stringify({
            title: newTitle.trim(),
            description: newDescription.trim() || null,
            video_url: newVideoUrl.trim(),
            is_youtube: newIsYoutube,
          }),
        }
      );
      setChallenges((prev) => [{ ...data.challenge, submission_count: 0 }, ...prev]);
      setNewTitle("");
      setNewDescription("");
      setNewVideoUrl("");
      setNewIsYoutube(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create.");
    }
  }

  if (!authorized) return <SecurityGate onAuth={onAuth} />;

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Create New Challenge</h3>
        </div>
        <div className="space-y-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Challenge title"
            className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full resize-y rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
          />
          <input
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            placeholder="Video URL (YouTube link or direct video URL)"
            className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={newIsYoutube}
              onChange={(e) => setNewIsYoutube(e.target.checked)}
              className="rounded"
            />
            Is YouTube video?
          </label>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await handleCreate();
                });
              }}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
            >
              {isPending ? "Creating…" : "Create Challenge"}
            </button>
          </div>
        </div>
      </div>

      {/* Challenges list */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Loading challenges…
        </div>
      ) : challenges.length === 0 ? (
        <div className="rounded-3xl border border-violet-200 bg-white py-14 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-violet-300" />
          <p className="text-sm text-gray-500">No challenges yet. Create one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((c) => (
            <ChallengeRow
              key={c.id}
              challenge={c}
              securityCode={securityCode}
              onDeleted={(id) =>
                setChallenges((prev) => prev.filter((ch) => ch.id !== id))
              }
              onUpdated={(updated) =>
                setChallenges((prev) =>
                  prev.map((ch) => (ch.id === updated.id ? { ...updated, submission_count: ch.submission_count } : ch))
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
