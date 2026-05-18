"use client";

import { useEffect, useRef, useState } from "react";
import { Trophy, CheckCircle, Eye, EyeOff, Upload, Link, FileVideo } from "lucide-react";

type Submission = {
  id: string | null;
  video_url: string | null;
  is_youtube: boolean | null;
  notes: string | null;
  public: boolean | null;
  status: string | null;
  seen_at: string | null;
  created_at: string | null;
};

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  is_youtube: boolean;
  active: boolean;
  created_at: string;
  my_submission: Submission | null;
};

function extractYoutubeId(url: string): string | null {
  return (
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)?.[1] ?? null
  );
}

function ChallengeCard({
  challenge,
  playerId,
  onUpdate,
}: {
  challenge: Challenge;
  playerId: string;
  onUpdate: (updated: Challenge) => void;
}) {
  // submission mode
  const [mode, setMode] = useState<"upload" | "youtube">("upload");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingPublic, setEditingPublic] = useState(
    challenge.my_submission?.public ?? false
  );
  const [editingNotes, setEditingNotes] = useState(
    challenge.my_submission?.notes ?? ""
  );
  const [saving, setSaving] = useState(false);

  const sub = challenge.my_submission;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let finalUrl = "";
    let finalIsYoutube = false;

    if (mode === "youtube") {
      const trimmed = youtubeUrl.trim();
      if (!trimmed) { setError("Please paste a YouTube URL."); return; }
      if (!extractYoutubeId(trimmed)) { setError("That doesn't look like a valid YouTube URL."); return; }
      finalUrl = trimmed;
      finalIsYoutube = true;
    } else {
      if (!selectedFile) { setError("Please choose a video file."); return; }
      // Upload to blob first
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const form = new FormData();
        form.append("file", selectedFile);
        const blobUrl = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (ev) => {
            if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          });
          xhr.addEventListener("load", () => {
            if (xhr.status < 300) {
              const data = JSON.parse(xhr.responseText) as { url: string };
              resolve(data.url);
            } else {
              reject(new Error("Upload failed"));
            }
          });
          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.open("POST", "/api/blob/upload");
          xhr.send(form);
        });
        finalUrl = blobUrl;
        finalIsYoutube = false;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/players/${playerId}/challenges/${challenge.id}/submit`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            video_url: finalUrl,
            is_youtube: finalIsYoutube,
            notes: notes.trim() || undefined,
            public: isPublic,
          }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to submit.");
        return;
      }
      const data = (await res.json()) as {
        submission: Omit<Submission, "id"> & { id: string };
      };
      onUpdate({ ...challenge, my_submission: data.submission });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/players/${playerId}/challenges/${challenge.id}/submit`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            public: editingPublic,
            notes: editingNotes.trim() || undefined,
          }),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          submission: Omit<Submission, "id"> & { id: string };
        };
        onUpdate({ ...challenge, my_submission: data.submission });
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const challengeYtId = challenge.is_youtube
    ? extractYoutubeId(challenge.video_url)
    : null;

  return (
    <div className="rounded-2xl border border-violet-200 bg-white overflow-hidden">
      {/* Coach video */}
      <div className="bg-gray-900 aspect-video w-full overflow-hidden">
        {challengeYtId ? (
          <iframe
            src={`https://www.youtube.com/embed/${challengeYtId}`}
            className="h-full w-full"
            allowFullScreen
            title={challenge.title}
          />
        ) : (
          <video
            src={challenge.video_url}
            controls
            className="h-full w-full object-contain"
          />
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900">{challenge.title}</h3>
          {challenge.description && (
            <p className="mt-1 text-sm text-gray-600">{challenge.description}</p>
          )}
        </div>

        {/* Submission status */}
        {sub ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                <CheckCircle className="h-3.5 w-3.5" />
                Completed
              </span>
              {sub.status === "seen" && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  Reviewed by coach
                </span>
              )}
            </div>

            {/* Their submission video */}
            {sub.video_url && (
              <div>
                {sub.is_youtube && sub.video_url ? (
                  (() => {
                    const ytId = extractYoutubeId(sub.video_url);
                    return ytId ? (
                      <div className="aspect-video overflow-hidden rounded-xl bg-gray-900">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          className="h-full w-full"
                          allowFullScreen
                          title="Your submission"
                        />
                      </div>
                    ) : (
                      <a
                        href={sub.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-violet-600 underline"
                      >
                        View submission
                      </a>
                    );
                  })()
                ) : (
                  <video
                    src={sub.video_url}
                    controls
                    className="w-full rounded-xl"
                  />
                )}
              </div>
            )}

            {/* Edit notes & public */}
            <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Add notes about your submission..."
                rows={2}
                className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditingPublic(!editingPublic)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    editingPublic
                      ? "bg-violet-100 text-violet-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {editingPublic ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  {editingPublic ? "Public" : "Private"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveEdit()}
                  disabled={saving}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Submission form */
          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Your Response Video
            </label>

            {/* Mode toggle */}
            <div className="flex gap-1.5 rounded-xl border border-violet-100 bg-violet-50 p-1">
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  mode === "upload" ? "bg-white shadow-sm text-violet-700" : "text-gray-500 hover:text-violet-600"
                }`}
              >
                <Upload className="h-3.5 w-3.5" /> Upload Video
              </button>
              <button
                type="button"
                onClick={() => setMode("youtube")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  mode === "youtube" ? "bg-white shadow-sm text-violet-700" : "text-gray-500 hover:text-violet-600"
                }`}
              >
                <Link className="h-3.5 w-3.5" /> YouTube Link
              </button>
            </div>

            {/* Upload mode */}
            {mode === "upload" && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition ${
                    selectedFile
                      ? "border-violet-300 bg-violet-50"
                      : "border-gray-200 hover:border-violet-300 hover:bg-violet-50"
                  }`}
                >
                  {selectedFile ? (
                    <>
                      <FileVideo className="h-6 w-6 text-violet-500" />
                      <span className="text-sm font-semibold text-violet-700">{selectedFile.name}</span>
                      <span className="text-xs text-violet-500">Click to change</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-gray-300" />
                      <span className="text-sm text-gray-500">Tap to choose a video</span>
                      <span className="text-xs text-gray-400">MP4, MOV, or WEBM</span>
                    </>
                  )}
                </div>
                {isUploading && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>Uploading…</span><span className="text-violet-600">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* YouTube mode */}
            {mode === "youtube" && (
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
              />
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes about your submission (optional)"
              rows={2}
              className="w-full resize-y rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isPublic ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {isPublic ? "Make public" : "Keep private"}
              </button>
              <button
                type="submit"
                disabled={submitting || isUploading}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
              >
                {isUploading ? "Uploading…" : submitting ? "Submitting…" : "Submit Response"}
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export function PlayerChallenges({ playerId }: { playerId: string }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${playerId}/challenges`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { challenges: Challenge[] } | null) => {
        if (data) setChallenges(data.challenges);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playerId]);

  function handleUpdate(updated: Challenge) {
    setChallenges((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        Loading challenges…
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50 px-6 py-14 text-center">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-violet-400" />
        <p className="text-base font-semibold text-violet-700">No Active Challenges</p>
        <p className="mt-1 text-sm text-violet-600 opacity-70">
          Check back after your next session — Coach David will post challenges here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {challenges.map((c) => (
        <ChallengeCard
          key={c.id}
          challenge={c}
          playerId={playerId}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}
