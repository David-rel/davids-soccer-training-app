"use client";

import { useEffect, useState } from "react";

type Video = {
  id: string;
  title: string;
  category: string | null;
  thumbnail_url: string | null;
};

type Pin = {
  id: string;
  priority: number;
  note: string | null;
  created_at: string;
  video_id: string;
  title: string;
  category: string | null;
  thumbnail_url: string | null;
};

export function PinnedVideos({ playerId }: { playerId: string }) {
  const [pins, setPins] = useState<Pin[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [priority, setPriority] = useState(1);
  const [note, setNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadPins() {
    try {
      const res = await fetch(`/api/admin/players/${playerId}/pin-video`);

      if (res.ok) {
        const data = await res.json();
        setPins(data.pins || []);
      }
    } catch (error) {
      console.error("Error loading pins:", error);
    }
  }

  async function loadVideos() {
    try {
      const res = await fetch("/api/videos");
      if (res.ok) {
        const data = await res.json();
        setAllVideos(data.videos || []);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
    }
  }

  useEffect(() => {
    loadPins();
    loadVideos();
  }, [playerId]);

  async function handlePin() {
    if (!selectedVideo) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/players/${playerId}/pin-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId: selectedVideo,
          priority,
          note: note || null,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSelectedVideo("");
        setPriority(1);
        setNote("");
        await loadPins();
      }
    } catch (error) {
      console.error("Error pinning video:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnpin(videoId: string) {
    try {
      const res = await fetch(
        `/api/admin/players/${playerId}/pin-video?videoId=${videoId}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        await loadPins();
      }
    } catch (error) {
      console.error("Error unpinning video:", error);
    }
  }

  const filteredVideos = allVideos.filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Pinned Videos for Player
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Videos you pin will appear at the top of this player's
            recommendations
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          + Pin Video
        </button>
      </div>

      {/* Pinned Videos List */}
      <div className="mt-6 space-y-3">
        {pins.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
            No videos pinned yet. Click "Pin Video" to recommend specific videos
            to this player.
          </div>
        ) : (
          pins.map((pin) => (
            <div
              key={pin.id}
              className="flex items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {pin.priority}
              </div>

              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{pin.title}</h4>
                {pin.note && (
                  <p className="mt-1 text-sm text-gray-600">{pin.note}</p>
                )}
                {pin.category && (
                  <span className="mt-2 inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {pin.category.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              <button
                onClick={() => handleUnpin(pin.video_id)}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                Unpin
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Pin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="w-full max-w-2xl rounded-2xl bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">
              Pin Video for Player
            </h3>
            <p className="mt-2 text-sm text-gray-300">
              Select a video to recommend to this player. It will appear at the
              top of their video feed.
            </p>

            <div className="mt-4 space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Search Videos
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                />
              </div>

              {/* Video Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Select Video
                </label>
                <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-600 bg-gray-800">
                  {filteredVideos.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      No videos found
                    </div>
                  ) : (
                    filteredVideos.slice(0, 50).map((video) => (
                      <button
                        key={video.id}
                        onClick={() => setSelectedVideo(video.id)}
                        className={`w-full border-b border-gray-700 p-3 text-left text-sm transition last:border-0 hover:bg-gray-700 ${
                          selectedVideo === video.id
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-800 text-gray-200"
                        }`}
                      >
                        <div className="font-medium">
                          {video.title}
                        </div>
                        {video.category && (
                          <div className="mt-1 text-xs text-gray-400">
                            {video.category.replace(/_/g, " ")}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Priority (1-10, higher = shows first)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Note (optional - shown instead of "Coach Recommended")
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., 'Work on this for next week'"
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handlePin}
                disabled={!selectedVideo || loading}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Pinning..." : "Pin Video"}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedVideo("");
                  setNote("");
                  setPriority(1);
                }}
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
