"use client";

import { useState } from "react";
import { PlayerInsights } from "./PlayerInsights";
import { PlayerGoals } from "./PlayerGoals";
import { PlayerSessions } from "./PlayerSessions";
import { PlayerVideos } from "./PlayerVideos";
import { PlayerUploads } from "./PlayerUploads";

type TabType = "tests" | "goals" | "sessions" | "videos" | "uploads";

interface PlayerContentTabsProps {
  playerId: string;
}

export default function PlayerContentTabs({ playerId }: PlayerContentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tests");

  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
      {/* Tab Navigation */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <button
          onClick={() => setActiveTab("tests")}
          className={
            activeTab === "tests"
              ? "rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition"
              : "rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          }
        >
          Tests & Progressions
        </button>
        <button
          onClick={() => setActiveTab("goals")}
          className={
            activeTab === "goals"
              ? "rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition"
              : "rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          }
        >
          Your Goals
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={
            activeTab === "sessions"
              ? "rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition"
              : "rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          }
        >
          Training Sessions
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={
            activeTab === "videos"
              ? "rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition"
              : "rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          }
        >
          Videos
        </button>
        <button
          onClick={() => setActiveTab("uploads")}
          className={
            activeTab === "uploads"
              ? "rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition"
              : "rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          }
        >
          Upload Content
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "tests" && <PlayerInsights playerId={playerId} />}
        {activeTab === "goals" && <PlayerGoals playerId={playerId} />}
        {activeTab === "sessions" && <PlayerSessions playerId={playerId} />}
        {activeTab === "videos" && <PlayerVideos playerId={playerId} />}
        {activeTab === "uploads" && <PlayerUploads playerId={playerId} />}
      </div>
    </div>
  );
}
