"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type VideoReport = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  video_id: string;
  video_title: string;
  video_url: string;
  category: string | null;
  player_id: string;
  player_name: string;
};

type RatedVideo = {
  video_id: string;
  video_title: string;
  video_url: string;
  category: string | null;
  avg_rating: number;
  rating_count: number;
  one_star: number;
  two_star: number;
  three_star: number;
  four_star: number;
  five_star: number;
};

export default function VideoReportsPage() {
  const [reports, setReports] = useState<VideoReport[]>([]);
  const [resolvedReports, setResolvedReports] = useState<VideoReport[]>([]);
  const [ratedVideos, setRatedVideos] = useState<RatedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "resolved" | "ratings">("pending");
  const [updating, setUpdating] = useState<string | null>(null);

  async function loadReports(status: string) {
    try {
      const securityCode = localStorage.getItem("adminSecurityCode") || "";
      const res = await fetch(`/api/admin/video-reports?status=${status}`, {
        headers: { "x-security-code": securityCode },
      });

      if (res.ok) {
        const data = await res.json();
        return data.reports || [];
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    }
    return [];
  }

  async function loadRatedVideos() {
    try {
      const securityCode = localStorage.getItem("adminSecurityCode") || "";
      const res = await fetch("/api/admin/video-ratings", {
        headers: { "x-security-code": securityCode },
      });

      if (res.ok) {
        const data = await res.json();
        return data.ratings || [];
      }
    } catch (error) {
      console.error("Error loading ratings:", error);
    }
    return [];
  }

  async function loadAllData() {
    setLoading(true);
    const [pending, resolved, ratings] = await Promise.all([
      loadReports("pending"),
      loadReports("resolved,reviewed,dismissed"),
      loadRatedVideos(),
    ]);
    setReports(pending);
    setResolvedReports(resolved);
    setRatedVideos(ratings);
    setLoading(false);
  }

  useEffect(() => {
    loadAllData();
  }, []);

  async function handleUpdateStatus(
    reportId: string,
    status: string,
    action?: string
  ) {
    setUpdating(reportId);
    try {
      const securityCode = localStorage.getItem("adminSecurityCode") || "";
      const res = await fetch("/api/admin/video-reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-security-code": securityCode,
        },
        body: JSON.stringify({ reportId, status, action }),
      });

      if (res.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error("Error updating report:", error);
    } finally {
      setUpdating(null);
    }
  }

  const currentReports = activeTab === "pending" ? reports : activeTab === "resolved" ? resolvedReports : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Video Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage reported videos and view ratings
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "pending"
                ? "bg-red-600 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Pending Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab("resolved")}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "resolved"
                ? "bg-gray-600 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Resolved ({resolvedReports.length})
          </button>
          <button
            onClick={() => setActiveTab("ratings")}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "ratings"
                ? "bg-emerald-600 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Video Ratings ({ratedVideos.length})
          </button>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="text-center text-gray-600">Loading...</div>
        ) : activeTab === "ratings" ? (
          ratedVideos.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-600">No videos have been rated yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratedVideos.map((video) => (
                <div
                  key={video.video_id}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {video.video_title}
                      </h3>
                      {video.category && (
                        <span className="mt-1 inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {video.category.replace(/_/g, " ")}
                        </span>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-700">
                            Average Rating
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className="h-5 w-5"
                                  fill={star <= Math.round(video.avg_rating) ? "#10b981" : "none"}
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
                              ))}
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {typeof video.avg_rating === 'number' ? video.avg_rating.toFixed(1) : Number(video.avg_rating).toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({Number(video.rating_count)} ratings)
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-gray-700">
                            Rating Breakdown
                          </div>
                          <div className="mt-1 space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-gray-600">5 stars:</span>
                              <div className="h-2 flex-1 rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-emerald-600"
                                  style={{ width: `${(Number(video.five_star) / Number(video.rating_count)) * 100}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-gray-900">{Number(video.five_star)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-gray-600">4 stars:</span>
                              <div className="h-2 flex-1 rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-emerald-500"
                                  style={{ width: `${(Number(video.four_star) / Number(video.rating_count)) * 100}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-gray-900">{Number(video.four_star)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-gray-600">3 stars:</span>
                              <div className="h-2 flex-1 rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-yellow-500"
                                  style={{ width: `${(Number(video.three_star) / Number(video.rating_count)) * 100}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-gray-900">{Number(video.three_star)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-gray-600">2 stars:</span>
                              <div className="h-2 flex-1 rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-orange-500"
                                  style={{ width: `${(Number(video.two_star) / Number(video.rating_count)) * 100}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-gray-900">{Number(video.two_star)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-gray-600">1 star:</span>
                              <div className="h-2 flex-1 rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-red-500"
                                  style={{ width: `${(Number(video.one_star) / Number(video.rating_count)) * 100}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-gray-900">{Number(video.one_star)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        Watch Video
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
                </div>
              ))}
            </div>
          )
        ) : currentReports.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600">
              {activeTab === "pending"
                ? "No pending reports"
                : "No resolved reports"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentReports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-red-100 p-2">
                        <svg
                          className="h-5 w-5 text-red-600"
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
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {report.video_title}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          <span>
                            Reported by: {report.player_name}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                          {report.category && (
                            <>
                              <span>•</span>
                              <span className="rounded bg-gray-100 px-2 py-0.5">
                                {report.category.replace(/_/g, " ")}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-gray-700">
                              Reason:
                            </span>
                            <span className="ml-2 text-sm text-gray-900">
                              {report.reason.replace(/_/g, " ")}
                            </span>
                          </div>
                          {report.description && (
                            <div>
                              <span className="text-xs font-semibold text-gray-700">
                                Details:
                              </span>
                              <p className="ml-2 text-sm text-gray-600">
                                {report.description}
                              </p>
                            </div>
                          )}
                        </div>

                        <a
                          href={report.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                        >
                          Watch Video
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
                  </div>

                  {/* Actions */}
                  {activeTab === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleUpdateStatus(report.id, "reviewed")
                        }
                        disabled={updating === report.id}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Mark Reviewed
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(
                            report.id,
                            "resolved",
                            "remove_video"
                          )
                        }
                        disabled={updating === report.id}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        Remove Video
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(report.id, "dismissed")
                        }
                        disabled={updating === report.id}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {activeTab === "resolved" && (
                    <div className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      Resolved
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
