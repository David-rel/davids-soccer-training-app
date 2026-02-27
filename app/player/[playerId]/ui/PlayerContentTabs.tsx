"use client";

import { useEffect, useState } from "react";
import { PlayerInsights } from "./PlayerInsights";
import { PlayerGoals } from "./PlayerGoals";
import { PlayerSessions } from "./PlayerSessions";
import { PlayerVideos } from "./PlayerVideos";
import { PlayerUploads } from "./PlayerUploads";
import {
  parsePlayerHash,
  scrollToPlayerSection,
  type PlayerVideoMode,
  updatePlayerHash,
} from "./playerHashNavigation";

type TabType = "tests" | "goals" | "sessions" | "videos" | "uploads";
type TabTargets = {
  testId: string | null;
  goalId: string | null;
  sessionId: string | null;
  videoId: string | null;
  uploadId: string | null;
  videoMode: PlayerVideoMode | null;
};

interface PlayerContentTabsProps {
  playerId: string;
  isAdminMode?: boolean;
}

export default function PlayerContentTabs({ playerId, isAdminMode }: PlayerContentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tests");
  const [tabTargets, setTabTargets] = useState<TabTargets>({
    testId: null,
    goalId: null,
    sessionId: null,
    videoId: null,
    uploadId: null,
    videoMode: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyHash = () => {
      const hashState = parsePlayerHash(window.location.hash);
      if (hashState.tab) {
        setActiveTab(hashState.tab);
      }

      setTabTargets({
        testId: hashState.testId,
        goalId: hashState.goalId,
        sessionId: hashState.sessionId,
        videoId: hashState.videoId,
        uploadId: hashState.uploadId,
        videoMode: hashState.videoMode,
      });

      if (hashState.section === "tests" || hashState.tab) {
        scrollToPlayerSection("player-tests-section");
      }
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
    };
  }, []);

  function handleTabClick(tab: TabType) {
    setActiveTab(tab);
    updatePlayerHash({ section: "tests", tab });
  }

  return (
    <section
      id="player-tests-section"
      className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm"
    >
      {/* Tab Navigation */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <button
          onClick={() => handleTabClick("tests")}
          className={
            activeTab === "tests"
              ? "rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition"
              : "rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          }
        >
          Tests & Progressions
        </button>
        <button
          onClick={() => handleTabClick("goals")}
          className={
            activeTab === "goals"
              ? "rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition"
              : "rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          }
        >
          Your Goals
        </button>
        <button
          onClick={() => handleTabClick("sessions")}
          className={
            activeTab === "sessions"
              ? "rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition"
              : "rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          }
        >
          Training Sessions
        </button>
        <button
          onClick={() => handleTabClick("videos")}
          className={
            activeTab === "videos"
              ? "rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition"
              : "rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          }
        >
          Videos
        </button>
        <button
          onClick={() => handleTabClick("uploads")}
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
        {activeTab === "tests" && (
          <PlayerInsights
            playerId={playerId}
            isAdminMode={isAdminMode}
            targetTestId={tabTargets.testId}
          />
        )}
        {activeTab === "goals" && (
          <PlayerGoals
            playerId={playerId}
            isAdminMode={isAdminMode}
            targetGoalId={tabTargets.goalId}
          />
        )}
        {activeTab === "sessions" && (
          <PlayerSessions
            playerId={playerId}
            isAdminMode={isAdminMode}
            targetSessionId={tabTargets.sessionId}
          />
        )}
        {activeTab === "videos" && (
          <PlayerVideos
            playerId={playerId}
            targetVideoId={tabTargets.videoId}
            targetVideoMode={tabTargets.videoMode}
          />
        )}
        {activeTab === "uploads" && (
          <PlayerUploads playerId={playerId} targetUploadId={tabTargets.uploadId} />
        )}
      </div>
    </section>
  );
}
