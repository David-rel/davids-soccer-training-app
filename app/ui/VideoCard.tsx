"use client";

import { useState } from "react";

type Video = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  category: string | null;
  thumbnail_url: string | null;
  duration: string | null;
  channel: string | null;
};

type VideoCardProps = {
  video: Video;
  playerId: string;
  onWatch?: () => void;
  onComplete?: () => void;
  onReport?: () => void;
  onRate?: (rating: number) => void;
  currentRating?: number | null;
  showProgress?: boolean;
  progressPercent?: number;
  lastPosition?: number;
};

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function VideoCard({
  video,
  playerId,
  onWatch,
  onComplete,
  onReport,
  onRate,
  currentRating,
  showProgress = false,
  progressPercent = 0,
  lastPosition = 0,
}: VideoCardProps) {
  const [engagementState, setEngagementState] = useState<"idle" | "watching" | "completed">("idle");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>("inappropriate");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [localRating, setLocalRating] = useState<number | null>(currentRating || null);

  const videoId = extractYouTubeId(video.video_url);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}${lastPosition > 0 ? `?start=${Math.floor(lastPosition)}` : ""}`
    : null;

  const handleWatch = () => {
    if (engagementState === "idle") {
      setEngagementState("watching");
      onWatch?.();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleWatch();
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Automatically track engagement when user clicks to watch
    // Don't prevent default - let the link open in a new tab normally
    handleWatch();
  };

  const handleComplete = () => {
    setEngagementState("completed");
    onComplete?.();
  };

  const handleReport = async () => {
    if (!reportReason) return;

    setSubmittingReport(true);
    try {
      const res = await fetch(`/api/players/${playerId}/videos/${video.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reportReason,
          description: reportDescription,
        }),
      });

      if (res.ok) {
        setShowReportModal(false);
        setReportReason("inappropriate");
        setReportDescription("");
        onReport?.();
      }
    } catch (error) {
      console.error("Error reporting video:", error);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleRating = async (rating: number) => {
    setLocalRating(rating);
    onRate?.(rating);

    // Also send to API directly
    try {
      await fetch(`/api/players/${playerId}/videos/${video.id}/engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rate", rating }),
      });
    } catch (error) {
      console.error("Error rating video:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      {/* Video Player */}
      {embedUrl ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <iframe
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
          {/* Transparent overlay to detect iframe clicks */}
          {engagementState === "idle" && (
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={handleOverlayClick}
              title="Click to start tracking this video"
            />
          )}
          {showProgress && progressPercent > 0 && progressPercent < 100 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div
                className="h-full bg-emerald-600"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Video preview unavailable
            </div>
          )}
        </div>
      )}

      {/* Continue Watching Info */}
      {showProgress && lastPosition > 0 && (
        <div className="mt-2 text-xs text-gray-600">
          Continue from {formatTime(lastPosition)} • {Math.round(progressPercent)}% complete
        </div>
      )}

      {/* Video Info */}
      <div className="mt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900">
            {video.title}
          </h3>
          {video.category && (
            <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
              {video.category.replace(/_/g, " ")}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          {video.duration && <span>{video.duration}</span>}
          {video.channel && <span>• {video.channel}</span>}
        </div>

        {/* 5-Star Rating */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-600">Rate:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(null)}
                className="transition hover:scale-110"
              >
                <svg
                  className="h-5 w-5"
                  fill={(hoveredStar !== null ? star <= hoveredStar : star <= (localRating || 0)) ? "#10b981" : "none"}
                  stroke="#10b981"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Engagement & Report Buttons */}
        <div className="mt-3 flex gap-2">
          {onComplete && engagementState === "watching" && (
            <button
              type="button"
              onClick={handleComplete}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Mark Complete
            </button>
          )}

          {engagementState === "completed" && (
            <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Completed
            </div>
          )}

          {/* Report Button */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            title="Report video"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </button>
        </div>

        {/* External Link */}
        <a
          href={video.video_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleLinkClick}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          Watch on YouTube
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Report Video</h3>
            <p className="mt-2 text-sm text-gray-300">
              Help us keep the video library high quality by reporting issues.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Reason
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                >
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="broken_link">Broken link or removed video</option>
                  <option value="incorrect_category">Incorrect category</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Additional details (optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Tell us more..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleReport}
                disabled={submittingReport}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {submittingReport ? "Submitting..." : "Submit Report"}
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
