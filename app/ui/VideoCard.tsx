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
  onWatch?: () => void;
  onComplete?: () => void;
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

export function VideoCard({ video, onWatch, onComplete }: VideoCardProps) {
  const [engagementState, setEngagementState] = useState<"idle" | "watching" | "completed">("idle");
  const videoId = extractYouTubeId(video.video_url);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}`
    : null;

  const handleWatch = () => {
    if (engagementState === "idle") {
      setEngagementState("watching");
      onWatch?.();
    }
  };

  const handleComplete = () => {
    setEngagementState("completed");
    onComplete?.();
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      {/* Video Player */}
      {embedUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-xl">
          <iframe
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
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

        {/* Engagement Buttons - Only show if callbacks provided */}
        {(onWatch || onComplete) && (
          <div className="mt-3 flex gap-2">
            {engagementState === "idle" && onWatch && (
              <button
                type="button"
                onClick={handleWatch}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Start Watching
              </button>
            )}

            {engagementState === "watching" && onComplete && (
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
          </div>
        )}

        {/* External Link */}
        <a
          href={video.video_url}
          target="_blank"
          rel="noopener noreferrer"
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
    </div>
  );
}
