"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Upload, CheckCircle2, Clock, ChevronDown, ChevronUp, FileVideo } from "lucide-react";

type UploadItem = {
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

type LimitInfo = { used: number; total: number; remaining: number; resetDate: string };

function UploadCard({ upload }: { upload: UploadItem }) {
  const [expanded, setExpanded] = useState(false);
  const reviewed = upload.status === "reviewed";

  return (
    <div
      id={`player-upload-${upload.id}`}
      className={`overflow-hidden rounded-2xl border transition-shadow hover:shadow-sm ${
        reviewed ? "border-emerald-200 bg-white" : "border-gray-200 bg-white"
      }`}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${reviewed ? "bg-emerald-100" : "bg-amber-100"}`}>
          {reviewed
            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            : <Clock className="h-4 w-4 text-amber-600" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${reviewed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {reviewed ? "Reviewed" : "Pending Review"}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(upload.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          {upload.description && (
            <p className="mt-0.5 truncate text-sm text-gray-600">{upload.description}</p>
          )}
        </div>

        {expanded
          ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
          {upload.description && (
            <p className="text-sm text-gray-600">{upload.description}</p>
          )}

          {/* Your video */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Your Clip</div>
            <video src={upload.video_url} controls className="w-full rounded-xl" style={{ maxHeight: 280 }} />
          </div>

          {/* Coach response */}
          {reviewed && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <div className="text-sm font-semibold text-emerald-800">Coach David's Feedback</div>

              {upload.coach_response_description && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {upload.coach_response_description}
                </p>
              )}

              {upload.coach_video_response_url && (
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-emerald-700">Video Response</div>
                  {/youtube\.com|youtu\.be|loom\.com/.test(upload.coach_video_response_url) ? (
                    <a
                      href={upload.coach_video_response_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Watch Video →
                    </a>
                  ) : (
                    <video src={upload.coach_video_response_url} controls className="w-full rounded-xl" style={{ maxHeight: 280 }} />
                  )}
                </div>
              )}

              {upload.coach_document_response_url && (
                <a
                  href={upload.coach_document_response_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Download Document →
                </a>
              )}
            </div>
          )}

          {!reviewed && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Coach David will review this and respond soon.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PlayerUploadsRevamped({ playerId }: { playerId: string }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [limit, setLimit] = useState<LimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadUploads() {
    try {
      setLoading(true);
      const res = await fetch(`/api/players/${playerId}/content`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data: { uploads: UploadItem[]; limit: LimitInfo } = await res.json();
      setUploads(data.uploads);
      setLimit(data.limit);
    } catch {
      setError("Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUploads(); }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  function validateAndSetFile(file: File) {
    setUploadError(null);
    setUploadSuccess(null);
    const validTypes = ["video/mp4", "video/quicktime", "video/webm"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please select a video file (MP4, MOV, or WEBM).");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setUploadError("File too large — max 500MB.");
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      setVideoDuration(v.duration);
      if (v.duration < 30) { setUploadError("Video must be at least 30 seconds."); setSelectedFile(null); }
      else if (v.duration > 180) { setUploadError("Video must be 3 minutes or shorter."); setSelectedFile(null); }
    };
    v.onerror = () => { URL.revokeObjectURL(url); setUploadError("Could not read video."); setSelectedFile(null); };
    v.src = url;
  }

  const handleUpload = () => {
    setUploadError(null);
    setUploadSuccess(null);
    if (!selectedFile || !videoDuration || videoDuration < 30 || videoDuration > 180) {
      setUploadError("Please select a valid video (30 sec – 3 min).");
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    startTransition(async () => {
      const t0 = Date.now();
      try {
        const form = new FormData();
        form.append("file", selectedFile);
        form.append("description", description.trim());
        form.append("durationSeconds", String(videoDuration));
        const text = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          });
          xhr.addEventListener("load", () => xhr.status < 300 ? resolve(xhr.responseText) : reject(new Error(xhr.responseText || "Upload failed")));
          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.open("POST", `/api/players/${playerId}/content/upload`);
          xhr.send(form);
        });
        const elapsed = Date.now() - t0;
        if (elapsed < 1500) await new Promise((r) => setTimeout(r, 1500 - elapsed));
        const data = JSON.parse(text) as { message?: string };
        setUploadSuccess(data.message || "Submitted! Coach David will review and respond soon.");
        setSelectedFile(null);
        setVideoDuration(null);
        setDescription("");
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadUploads();
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Upload failed.");
        setUploadProgress(0);
      } finally {
        setIsUploading(false);
      }
    });
  };

  const canUpload = !!limit && limit.remaining > 0;

  return (
    <div className="space-y-6">
      {/* Limit pill */}
      {limit && (
        <div className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
          <div>
            <span className="text-sm font-semibold text-orange-800">
              {limit.used} / {limit.total} uploads used this month
            </span>
            <p className="text-xs text-orange-600">
              Resets {new Date(limit.resetDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: limit.total }).map((_, i) => (
              <div key={i} className={`h-2 w-6 rounded-full ${i < limit.used ? "bg-orange-400" : "bg-orange-200"}`} />
            ))}
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Send a Clip</h3>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) validateAndSetFile(file);
          }}
          onClick={() => canUpload && !isUploading && fileInputRef.current?.click()}
          className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition ${
            dragOver
              ? "border-orange-400 bg-orange-50"
              : selectedFile
              ? "border-emerald-300 bg-emerald-50"
              : canUpload
              ? "border-gray-200 hover:border-orange-300 hover:bg-orange-50"
              : "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f); }}
            disabled={!canUpload || isUploading}
          />
          {selectedFile ? (
            <>
              <FileVideo className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">{selectedFile.name}</p>
              <p className="text-xs text-emerald-600">{videoDuration ? `${Math.round(videoDuration)}s` : "…"} · Click to change</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">Drop a video here, or click to choose</p>
              <p className="text-xs text-gray-400">MP4, MOV, or WEBM · 30 sec – 3 min · max 500MB</p>
            </>
          )}
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What do you want Coach David to look at? (optional)"
          rows={2}
          disabled={!canUpload || isUploading}
          className="mb-4 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50 disabled:bg-gray-50"
        />

        {/* Error / success */}
        {(uploadError || uploadSuccess) && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${uploadError ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {uploadError || uploadSuccess}
          </div>
        )}

        {/* Progress bar */}
        {isUploading && (
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-xs font-medium text-gray-600">
              <span>{uploadProgress < 100 ? "Uploading…" : "Saving to cloud…"}</span>
              <span className="text-orange-600">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full bg-orange-500 transition-all duration-300 ${uploadProgress === 100 ? "animate-pulse" : ""}`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!canUpload || !selectedFile || !videoDuration || isUploading || isPending}
          className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Uploading…" : "Send to Coach David"}
        </button>
      </div>

      {/* Previous submissions */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Your Submissions</h3>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {!loading && !error && uploads.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-10 text-center">
            <Upload className="mx-auto mb-2 h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">No clips submitted yet.</p>
          </div>
        )}
        {!loading && uploads.length > 0 && (
          <div className="space-y-3">
            {uploads.map((u) => <UploadCard key={u.id} upload={u} />)}
          </div>
        )}
      </div>
    </div>
  );
}
