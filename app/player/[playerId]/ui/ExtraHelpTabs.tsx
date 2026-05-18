"use client";

import { useState } from "react";
import { PlaySquare, Upload, CalendarDays, Trophy } from "lucide-react";
import { PlayerVideos } from "./PlayerVideos";
import { PlayerUploadsRevamped } from "./PlayerUploadsRevamped";
import { BookACall } from "./BookACall";
import { PlayerChallenges } from "./PlayerChallenges";

const TABS = [
  { id: "library", label: "Video Library", icon: PlaySquare, color: "emerald" },
  { id: "uploads", label: "Upload Clips", icon: Upload, color: "orange" },
  { id: "call", label: "Book a Call", icon: CalendarDays, color: "blue" },
  { id: "challenges", label: "Challenges", icon: Trophy, color: "violet" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const COLOR_MAP = {
  emerald: {
    active: "bg-emerald-600 text-white shadow-sm",
    inactive: "text-gray-500 hover:text-emerald-700 hover:bg-emerald-50",
    iconActive: "text-white",
    iconInactive: "text-emerald-500",
  },
  orange: {
    active: "bg-orange-500 text-white shadow-sm",
    inactive: "text-gray-500 hover:text-orange-700 hover:bg-orange-50",
    iconActive: "text-white",
    iconInactive: "text-orange-500",
  },
  blue: {
    active: "bg-blue-600 text-white shadow-sm",
    inactive: "text-gray-500 hover:text-blue-700 hover:bg-blue-50",
    iconActive: "text-white",
    iconInactive: "text-blue-500",
  },
  violet: {
    active: "bg-violet-600 text-white shadow-sm",
    inactive: "text-gray-500 hover:text-violet-700 hover:bg-violet-50",
    iconActive: "text-white",
    iconInactive: "text-violet-500",
  },
};

function ComingSoon({ label, icon: Icon, color }: { label: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const bg = color === "blue" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-violet-50 border-violet-200 text-violet-700";
  const iconColor = color === "blue" ? "text-blue-400" : "text-violet-400";
  return (
    <div className={`rounded-2xl border ${bg} px-6 py-14 text-center`}>
      <Icon className={`mx-auto mb-3 h-10 w-10 ${iconColor}`} />
      <p className="text-base font-semibold">{label}</p>
      <p className="mt-1 text-sm opacity-70">Coming soon — check back after your next session.</p>
    </div>
  );
}

export function ExtraHelpTabs({ playerId }: { playerId: string }) {
  const [active, setActive] = useState<TabId>("library");
  const tab = TABS.find((t) => t.id === active)!;
  const colors = COLOR_MAP[tab.color];

  return (
    <div>
      {/* Tab strip */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-1">
        {TABS.map((t) => {
          const isActive = t.id === active;
          const c = COLOR_MAP[t.color];
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:flex-row sm:justify-center sm:gap-2 sm:text-sm ${
                isActive ? c.active : c.inactive
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? c.iconActive : c.iconInactive}`} />
              <span className="leading-tight text-center sm:text-left">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section content */}
      {active === "library" && <PlayerVideos playerId={playerId} />}
      {active === "uploads" && <PlayerUploadsRevamped playerId={playerId} />}
      {active === "call" && <BookACall playerId={playerId} />}
      {active === "challenges" && <PlayerChallenges playerId={playerId} />}
    </div>
  );
}
