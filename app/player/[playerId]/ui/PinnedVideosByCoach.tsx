"use client";

import { useEffect, useState } from "react";
import { VideoCard } from "@/app/ui/VideoCard";

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

type PinnedVideo = {
  id: string;
  priority: number;
  note: string | null;
  created_at: string;
  video_id: string;
  video: Video;
};

export function PinnedVideosByCoach({ playerId }: { playerId: string }) {
  const [pinnedVideos, setPinnedVideos] = useState<PinnedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPinnedVideos() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/players/${playerId}/videos/pinned`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load pinned videos: ${res.status}`);
      }
      const data = await res.json();
      setPinnedVideos(data.pins ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pinned videos");
      console.error("Error loading pinned videos:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPinnedVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  async function handleVideoEngagement(videoId: string, action: "watch" | "complete") {
    try {
      await fetch(`/api/players/${playerId}/videos/${videoId}/engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      // Optionally refresh pinned videos after engagement
    } catch (e) {
      console.error("Error tracking engagement:", e);
    }
  }

  // Don't show anything if there are no pinned videos
  if (loading) {
    return null;
  }

  if (error || pinnedVideos.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-emerald-100 p-2">
          <svg
            className="h-5 w-5 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Coach Recommended Videos
          </div>
          <p className="mt-1 text-xs text-gray-600">
            Coach David has specially selected these videos for you.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {pinnedVideos.map((pin) => (
          <div key={pin.id} className="space-y-2">
            {/* Priority Badge and Note */}
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {pin.priority}
              </div>
              {pin.note && (
                <div className="flex-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                  <span className="font-semibold">Coach's note:</span> {pin.note}
                </div>
              )}
            </div>

            {/* Video Card */}
            <VideoCard
              video={pin.video}
              playerId={playerId}
              onWatch={() => handleVideoEngagement(pin.video_id, "watch")}
              onComplete={() => handleVideoEngagement(pin.video_id, "complete")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
