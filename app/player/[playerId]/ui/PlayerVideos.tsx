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

type ScoredVideo = {
  video: Video;
  testAlignmentScore: number;
  engagementScore: number;
  finalScore: number;
  rank: number;
  reason: string;
  relevantWeaknesses: string[];
};

type RecommendationResponse = {
  recommendations: ScoredVideo[];
  metadata: {
    total_videos: number;
    has_profile: boolean;
    profile_computed_at: string | null;
    engagement_count: number;
    compute_time_ms: number;
  };
};

type ContinueWatchingVideo = Video & {
  last_position_seconds: number;
  total_watch_time_seconds: number;
  last_watched_at: string;
  watch_count: number;
  rating_stars: number | null;
};

type ViewMode = "recommendations" | "browse" | "continue";

export function PlayerVideos({ playerId }: { playerId: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>("recommendations");
  const [videos, setVideos] = useState<Video[]>([]);
  const [recommendations, setRecommendations] = useState<ScoredVideo[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingVideo[]>([]);
  const [recommendationMetadata, setRecommendationMetadata] = useState<RecommendationResponse["metadata"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecommendForm, setShowRecommendForm] = useState(false);
  const [recommendUrl, setRecommendUrl] = useState("");
  const [recommendTitle, setRecommendTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);

  const VIDEOS_PER_PAGE = 5;

  async function loadRecommendations() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/players/${playerId}/videos/recommendations`, {
        cache: "no-store"
      });
      if (!res.ok) {
        throw new Error(`Failed to load recommendations: ${res.status}`);
      }
      const data: RecommendationResponse = await res.json();
      setRecommendations(data.recommendations ?? []);
      setRecommendationMetadata(data.metadata);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recommendations");
      console.error("Error loading recommendations:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadVideos() {
    try {
      setError(null);
      setLoading(true);
      const url =
        selectedCategory === "all"
          ? "/api/videos"
          : `/api/videos?category=${selectedCategory}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load videos: ${res.status}`);
      }
      const data = await res.json();
      setVideos(data.videos ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load videos");
      console.error("Error loading videos:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadContinueWatching() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/players/${playerId}/videos/continue-watching`, {
        cache: "no-store"
      });
      if (!res.ok) {
        throw new Error(`Failed to load continue watching: ${res.status}`);
      }
      const data = await res.json();
      setContinueWatching(data.videos ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load continue watching");
      console.error("Error loading continue watching:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (viewMode === "recommendations") {
      loadRecommendations();
    } else if (viewMode === "continue") {
      loadContinueWatching();
    } else {
      loadVideos();
    }
    setCurrentPage(0); // Reset to first page when view mode or category changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedCategory]);

  async function handleVideoEngagement(videoId: string, action: "watch" | "complete") {
    try {
      const res = await fetch(`/api/players/${playerId}/videos/${videoId}/engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      if (!res.ok) {
        throw new Error(`Failed to track engagement: ${res.status}`);
      }

      // Refresh recommendations to reflect engagement update
      if (viewMode === "recommendations") {
        loadRecommendations();
      }
    } catch (e) {
      console.error("Error tracking engagement:", e);
    }
  }

  // Calculate pagination
  const displayItems = viewMode === "recommendations"
    ? recommendations
    : viewMode === "continue"
    ? continueWatching
    : videos;
  const totalPages = Math.ceil(displayItems.length / VIDEOS_PER_PAGE);
  const startIndex = currentPage * VIDEOS_PER_PAGE;
  const endIndex = startIndex + VIDEOS_PER_PAGE;
  const currentVideos = viewMode === "recommendations"
    ? recommendations.slice(startIndex, endIndex)
    : viewMode === "continue"
    ? continueWatching.slice(startIndex, endIndex)
    : videos.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  async function handleRecommend(e: React.FormEvent) {
    e.preventDefault();
    if (!recommendUrl.trim()) return;

    setSubmitting(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      const res = await fetch(`/api/players/${playerId}/videos/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: recommendUrl,
          title: recommendTitle || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || (await res.text()) || "Failed to submit recommendation"
        );
      }

      setSubmitSuccess(true);
      setRecommendUrl("");
      setRecommendTitle("");
      setTimeout(() => {
        setShowRecommendForm(false);
        setSubmitSuccess(false);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Training Videos
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {viewMode === "recommendations"
              ? "Personalized videos based on your test scores."
              : viewMode === "continue"
              ? "Pick up where you left off."
              : "Browse all videos by category."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRecommendForm(!showRecommendForm)}
          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
        >
          Suggest
        </button>
      </div>

      {/* View Mode Toggle - 3 tabs */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setViewMode("recommendations")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            viewMode === "recommendations"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          For You
        </button>
        <button
          type="button"
          onClick={() => setViewMode("continue")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            viewMode === "continue"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          Continue
        </button>
        <button
          type="button"
          onClick={() => setViewMode("browse")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            viewMode === "browse"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          Browse All
        </button>
      </div>

      {/* Category Dropdown - Only show in browse mode */}
      {viewMode === "browse" && (
        <div className="mt-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="all">All Videos</option>
            <option value="ball_mastery">Ball Mastery</option>
            <option value="dribbling">Dribbling</option>
            <option value="shooting">Shooting</option>
            <option value="passing_first_touch">Passing First Touch</option>
            <option value="first_touch">First Touch</option>
            <option value="defending_shape">Defending Shape</option>
            <option value="speed_agility">Speed Agility</option>
            <option value="core_strength">Core Strength</option>
            <option value="stretching">Stretching</option>
          </select>
        </div>
      )}

      {/* Recommendation Metadata */}
      {viewMode === "recommendations" && recommendationMetadata && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {recommendationMetadata.has_profile
            ? `Showing ${recommendations.length} videos ranked by your test results`
            : "Complete some tests to get personalized recommendations!"}
        </div>
      )}

      {/* Recommend Form */}
      {showRecommendForm && (
        <form
          onSubmit={handleRecommend}
          className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <div className="text-sm font-semibold text-gray-900">
            Suggest a Video
          </div>
          <p className="mt-1 text-xs text-gray-600">
            If you have a video that you'd like to share with others, submit the
            URL and title below. Your suggestion will be reviewed by Coach David
            before being added to the library.
          </p>

          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                YouTube URL *
              </label>
              <input
                type="url"
                value={recommendUrl}
                onChange={(e) => setRecommendUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                value={recommendTitle}
                onChange={(e) => setRecommendTitle(e.target.value)}
                placeholder="Video title"
                className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => setShowRecommendForm(false)}
              className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              Cancel
            </button>
          </div>

          {submitSuccess && (
            <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
              Video submitted for coach review!
            </div>
          )}
        </form>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Videos List */}
      {loading ? (
        <div className="mt-4 text-sm text-gray-600">Loading videos...</div>
      ) : displayItems.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-gray-600">
          {viewMode === "recommendations"
            ? "No recommendations available. Complete some tests to get personalized videos!"
            : "No videos available yet. Check back soon!"}
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-4">
            {viewMode === "recommendations"
              ? currentVideos.map((item) => {
                  const scoredVideo = item as ScoredVideo;
                  return (
                    <div key={scoredVideo.video.id} className="space-y-2">
                      {/* Recommendation Info */}
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                            #{scoredVideo.rank}
                          </span>
                          <span className="text-xs font-medium text-emerald-800">
                            {Math.round(scoredVideo.finalScore)}% match
                          </span>
                        </div>
                        <div className="text-xs text-emerald-700">
                          {scoredVideo.reason}
                        </div>
                      </div>

                      {/* Video Card */}
                      <VideoCard
                        video={scoredVideo.video}
                        playerId={playerId}
                        onWatch={() => handleVideoEngagement(scoredVideo.video.id, "watch")}
                        onComplete={() => handleVideoEngagement(scoredVideo.video.id, "complete")}
                      />
                    </div>
                  );
                })
              : viewMode === "continue"
              ? currentVideos.map((item) => {
                  const cwVideo = item as ContinueWatchingVideo;
                  // Calculate progress percentage (assuming duration is in format like "10:23")
                  const durationParts = cwVideo.duration?.split(':') || [];
                  const totalSeconds = durationParts.length === 2
                    ? parseInt(durationParts[0]) * 60 + parseInt(durationParts[1])
                    : 0;
                  const progressPercent = totalSeconds > 0
                    ? (cwVideo.last_position_seconds / totalSeconds) * 100
                    : 0;

                  return (
                    <VideoCard
                      key={cwVideo.id}
                      video={cwVideo}
                      playerId={playerId}
                      currentRating={cwVideo.rating_stars}
                      showProgress={true}
                      progressPercent={progressPercent}
                      lastPosition={cwVideo.last_position_seconds}
                      onWatch={() => handleVideoEngagement(cwVideo.id, "watch")}
                      onComplete={() => handleVideoEngagement(cwVideo.id, "complete")}
                    />
                  );
                })
              : currentVideos.map((item) => {
                  const video = item as Video;
                  return (
                    <VideoCard
                      key={video.id}
                      video={video}
                      playerId={playerId}
                      onWatch={() => handleVideoEngagement(video.id, "watch")}
                      onComplete={() => handleVideoEngagement(video.id, "complete")}
                    />
                  );
                })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>

              <div className="text-xs text-gray-600">
                {startIndex + 1}-{Math.min(endIndex, displayItems.length)} of{" "}
                {displayItems.length}
              </div>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
