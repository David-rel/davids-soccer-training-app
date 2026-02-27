"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type Upload = {
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

type LimitInfo = {
  used: number;
  total: number;
  remaining: number;
  resetDate: string;
};

type ListResponse = {
  uploads: Upload[];
  limit: LimitInfo;
};

export function PlayerUploads({
  playerId,
  targetUploadId,
}: {
  playerId: string;
  targetUploadId?: string | null;
}) {
  const [uploads, setUploads] = useState<Upload[]>([]);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastAppliedTargetRef = useRef<string | null>(null);

  async function loadUploads() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/players/${playerId}/content`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load uploads");
      const data: ListResponse = await res.json();
      setUploads(data.uploads);
      setLimit(data.limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadUploads();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  useEffect(() => {
    if (!targetUploadId) {
      lastAppliedTargetRef.current = null;
      return;
    }
    if (lastAppliedTargetRef.current === targetUploadId) return;
    const exists = uploads.some((upload) => upload.id === targetUploadId);
    if (!exists) return;

    window.requestAnimationFrame(() => {
      const element = document.getElementById(`player-upload-${targetUploadId}`);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    lastAppliedTargetRef.current = targetUploadId;
  }, [targetUploadId, uploads]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);

    // Validate file type
    const validTypes = ["video/mp4", "video/quicktime", "video/webm"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please select a video file (MP4, MOV, or WEBM)");
      return;
    }

    // Validate file size (500MB)
    const maxBytes = 500 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError("Video file is too large (max 500MB)");
      return;
    }

    setSelectedFile(file);

    // Load video to check duration
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(videoUrl);
      const duration = video.duration;
      setVideoDuration(duration);

      if (duration < 30) {
        setUploadError("Video must be at least 30 seconds long");
        setSelectedFile(null);
      } else if (duration > 180) {
        setUploadError("Video must be no longer than 3 minutes (180 seconds)");
        setSelectedFile(null);
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      setUploadError("Could not read video file");
      setSelectedFile(null);
    };
    video.src = videoUrl;
  };

  const handleUpload = () => {
    setUploadError(null);
    setUploadSuccess(null);

    if (!selectedFile || !videoDuration) {
      setUploadError("Please select a valid video file");
      return;
    }

    if (videoDuration < 30 || videoDuration > 180) {
      setUploadError("Video must be between 30 seconds and 3 minutes");
      return;
    }

    // Set uploading state immediately BEFORE startTransition
    setIsUploading(true);
    setUploadProgress(0);

    startTransition(async () => {
      const uploadStartTime = Date.now();

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("description", description.trim());
        formData.append("durationSeconds", String(videoDuration));

        // Use XMLHttpRequest to track upload progress
        const uploadResponse = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percentComplete);
            }
          });

          // Handle completion
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.responseText);
            } else {
              reject(new Error(xhr.responseText || "Upload failed"));
            }
          });

          // Handle errors
          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload cancelled"));
          });

          // Send request
          xhr.open("POST", `/api/players/${playerId}/content/upload`);
          xhr.send(formData);
        });

        // Parse response
        const uploadData = JSON.parse(uploadResponse);

        // Ensure progress bar shows for at least 1.5 seconds so user can see it
        const uploadDuration = Date.now() - uploadStartTime;
        const minDisplayTime = 1500; // 1.5 seconds
        if (uploadDuration < minDisplayTime) {
          await new Promise(resolve => setTimeout(resolve, minDisplayTime - uploadDuration));
        }

        setUploadSuccess(uploadData.message || "Video uploaded successfully! Coach will review and respond soon.");

        // Reset form
        setSelectedFile(null);
        setVideoDuration(null);
        setDescription("");
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";

        // Reload uploads
        await loadUploads();
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Upload failed");
        setUploadProgress(0);
      } finally {
        setIsUploading(false);
      }
    });
  };

  const canUpload = limit && limit.remaining > 0;
  const resetDateFormatted = limit
    ? new Date(limit.resetDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Upload Content</h2>
        <p className="mt-1 text-sm text-gray-600">
          Upload videos (30 seconds to 3 minutes) for Coach David to review and
          provide feedback.
        </p>
      </div>

      {/* Monthly Limit Info */}
      {limit && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            You&apos;ve used{" "}
            <strong>
              {limit.used}/{limit.total}
            </strong>{" "}
            uploads this month.
            {limit.remaining > 0 ? (
              <>
                {" "}
                You have <strong>{limit.remaining}</strong> remaining.
              </>
            ) : (
              <> Monthly limit reached.</>
            )}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Resets on {resetDateFormatted}
          </p>
        </div>
      )}

      {/* Upload Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Upload New Video
        </h3>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={handleFileSelect}
          disabled={!canUpload || isUploading}
        />

        {/* File Selection */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canUpload || isUploading}
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {selectedFile ? "Change Video" : "Choose Video"}
          </button>
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: <strong>{selectedFile.name}</strong> (
              {videoDuration ? `${Math.round(videoDuration)}s` : "..."})
            </p>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell Coach David what you'd like feedback on..."
            rows={3}
            disabled={!canUpload || isUploading}
            className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-800 outline-none transition placeholder:text-gray-500 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-gray-50"
          />
        </div>

        {/* Error/Success Messages */}
        {(uploadError || uploadSuccess) && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              uploadError
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {uploadError || uploadSuccess}
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                {uploadProgress === 100
                  ? "Processing and saving video..."
                  : "Uploading video..."}
              </span>
              <span className="font-semibold text-emerald-600">
                {uploadProgress}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  uploadProgress === 100
                    ? "bg-emerald-600 animate-pulse"
                    : "bg-emerald-600"
                }`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {uploadProgress === 100
                ? "Almost done! Saving your video to cloud storage..."
                : "Please don't close this page while uploading"}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={
            !canUpload ||
            !selectedFile ||
            !videoDuration ||
            isUploading ||
            isPending
          }
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading ? "Uploading..." : "Submit Video"}
        </button>
      </div>

      {/* Previous Uploads */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Your Submissions
        </h3>

        {loading && <p className="text-sm text-gray-600">Loading...</p>}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && uploads.length === 0 && (
          <p className="text-sm text-gray-600">
            No submissions yet. Upload your first video above!
          </p>
        )}

        {!loading && uploads.length > 0 && (
          <div className="space-y-4">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                id={`player-upload-${upload.id}`}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                {/* Submission Info */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      Submitted{" "}
                      {new Date(upload.created_at).toLocaleDateString()}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        upload.status === "reviewed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {upload.status === "reviewed" ? "Reviewed" : "Pending"}
                    </span>
                  </div>
                  {upload.description && (
                    <p className="mt-2 text-sm text-gray-600">
                      {upload.description}
                    </p>
                  )}
                </div>

                {/* Your Video */}
                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Your Video
                  </p>
                  <video
                    src={upload.video_url}
                    controls
                    className="w-full rounded-xl"
                    style={{ maxHeight: "300px" }}
                  />
                </div>

                {/* Coach Response */}
                {upload.status === "reviewed" && (
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-emerald-800">
                      Coach&apos;s Response
                    </p>

                    {upload.coach_response_description && (
                      <p className="mb-3 whitespace-pre-wrap text-sm text-gray-700">
                        {upload.coach_response_description}
                      </p>
                    )}

                    {upload.coach_video_response_url && (
                      <div className="mb-3">
                        <p className="mb-2 text-xs font-medium text-gray-600">
                          Video Response
                        </p>
                        {upload.coach_video_response_url.includes(
                          "youtube.com"
                        ) ||
                        upload.coach_video_response_url.includes("youtu.be") ||
                        upload.coach_video_response_url.includes("loom.com") ? (
                          <a
                            href={upload.coach_video_response_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-emerald-600 underline hover:text-emerald-700"
                          >
                            Watch Video
                          </a>
                        ) : (
                          <video
                            src={upload.coach_video_response_url}
                            controls
                            className="w-full rounded-lg"
                            style={{ maxHeight: "300px" }}
                          />
                        )}
                      </div>
                    )}

                    {upload.coach_document_response_url && (
                      <div>
                        <p className="mb-2 text-xs font-medium text-gray-600">
                          Document
                        </p>
                        <a
                          href={upload.coach_document_response_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-600 underline hover:text-emerald-700"
                        >
                          Download Document
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
