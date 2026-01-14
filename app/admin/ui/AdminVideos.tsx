"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  published: boolean;
  source: string;
  recommended_by_parent_id: string | null;
  created_at: string;
};

export function AdminVideos({ securityCode }: { securityCode: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "true" | "false">("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // Add video form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPublished, setNewPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    "ball_mastery",
    "dribbling",
    "shooting",
    "passing_first_touch",
    "first_touch",
    "defending_shape",
    "speed_agility",
    "core_strength",
    "stretching",
  ];

  async function loadVideos() {
    try {
      setError(null);
      setLoading(true);
      const url =
        filter === "all"
          ? "/api/admin/videos"
          : `/api/admin/videos?published=${filter}`;
      const res = await fetch(url, {
        headers: { "x-security-code": securityCode },
        cache: "no-store",
      });
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

  useEffect(() => {
    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, securityCode]);

  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newVideoUrl.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-security-code": securityCode,
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || null,
          video_url: newVideoUrl,
          category: newCategory || null,
          published: newPublished,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to add video");
      }

      // Reset form
      setNewTitle("");
      setNewDescription("");
      setNewVideoUrl("");
      setNewCategory("");
      setNewPublished(true);
      setShowAddForm(false);
      await loadVideos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add video");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePublish(videoId: string, currentPublished: boolean) {
    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-security-code": securityCode,
        },
        body: JSON.stringify({ published: !currentPublished }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update video");
      }

      await loadVideos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update video");
    }
  }

  async function handleDeleteVideo(videoId: string) {
    if (!confirm("Are you sure you want to delete this video?")) return;

    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: "DELETE",
        headers: { "x-security-code": securityCode },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete video");
      }

      await loadVideos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete video");
    }
  }

  const publishedCount = videos.filter((v) => v.published).length;
  const pendingCount = videos.filter((v) => !v.published).length;

  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">
            Video Management
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Manage training videos and review parent recommendations.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/video-reports"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Video Reports
          </Link>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            {showAddForm ? "Cancel" : "Add Video"}
          </button>
        </div>
      </div>

      {/* Add Video Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddVideo}
          className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <div className="text-sm font-semibold text-gray-900">
            Add New Video
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Title *
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              YouTube URL *
            </label>
            <input
              type="url"
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm"
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={newPublished}
              onChange={(e) => setNewPublished(e.target.checked)}
              className="h-4 w-4 rounded border-emerald-300 text-emerald-600"
            />
            <label htmlFor="published" className="text-sm text-gray-700">
              Publish immediately
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add Video"}
          </button>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            filter === "all"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          All Videos ({videos.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("true")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            filter === "true"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          Published ({publishedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("false")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            filter === "false"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          Pending Review ({pendingCount})
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Videos Grid */}
      {loading ? (
        <div className="mt-4 text-sm text-gray-600">Loading videos...</div>
      ) : videos.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-gray-600">
          No videos found.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {video.title}
                    </h3>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        video.published
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {video.published ? "Published" : "Pending"}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {video.source === "coach" ? "Coach" : "Parent"}
                    </span>
                  </div>

                  {video.description && (
                    <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                      {video.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                    {video.category && (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">
                        {video.category.replace(/_/g, " ")}
                      </span>
                    )}
                    {video.duration && <span>{video.duration}</span>}
                    {video.channel && <span>• {video.channel}</span>}
                  </div>

                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-emerald-600 hover:text-emerald-700"
                  >
                    View on YouTube →
                  </a>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleTogglePublish(video.id, video.published)
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      video.published
                        ? "border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                        : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {video.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteVideo(video.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
