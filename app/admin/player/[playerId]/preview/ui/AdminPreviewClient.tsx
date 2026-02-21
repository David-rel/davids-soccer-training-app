"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import PlayerContentTabs from "@/app/player/[playerId]/ui/PlayerContentTabs";
import { PlayerFeedbackSection } from "@/app/player/[playerId]/ui/PlayerFeedbackSection";
import { ChatWrapper } from "@/app/player/[playerId]/ui/ChatWrapper";

type Player = {
  id: string;
  name: string;
  birthdate: string | null;
  team_level: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  dominant_foot: string | null;
  profile_photo_url: string | null;
  strengths: string | null;
  focus_areas: string | null;
  long_term_development_notes: string | null;
};

export default function AdminPreviewClient(props: {
  params: Promise<{ playerId: string }>;
}) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    props.params.then((p) => setPlayerId(p.playerId));
  }, [props.params]);

  useEffect(() => {
    if (!playerId) return;
    void loadData();
  }, [playerId]);

  async function loadData() {
    if (!playerId) {
      setError("No player ID found");
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      // Fetch player data
      const playerRes = await fetch(`/api/admin/players/${playerId}`);

      if (!playerRes.ok) {
        const text = await playerRes.text();
        throw new Error(`Failed to load player: ${text || playerRes.status}`);
      }

      const playerData = await playerRes.json();
      setPlayer(playerData.player);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="text-sm text-gray-600">{error ?? "Player not found"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <header className="bg-linear-to-r from-emerald-600 to-emerald-700">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/icon.png"
                alt="Icon"
                width={56}
                height={56}
                className="h-14 w-14 rounded-2xl bg-white p-2"
              />
              <div>
                <div className="text-sm font-semibold text-emerald-50">
                  David's Soccer Training
                </div>
                <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                  {player.name}
                </h1>
                <p className="mt-2 text-sm text-emerald-100">
                  Admin Preview: Parent View
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/admin/player/${playerId}`}
                className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
              >
                Back to admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="space-y-6">
          {/* Section 1: Profile + Coach Notes Combined */}
          <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Left: Player Details */}
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Player Details
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Basic profile information (read-only preview).
                  </p>
                </div>
                
                {/* Profile Picture */}
                {player.profile_photo_url && (
                  <div className="mb-6">
                    <Image
                      src={player.profile_photo_url}
                      alt={player.name}
                      width={120}
                      height={120}
                      className="h-30 w-30 rounded-full object-cover border-4 border-emerald-200"
                    />
                  </div>
                )}
                
                <div className="space-y-4">
                  {player.birthdate && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500">
                        Birthdate
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        {player.birthdate}
                      </div>
                    </div>
                  )}
                  {player.team_level && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500">
                        Team Level
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        {player.team_level}
                      </div>
                    </div>
                  )}
                  {player.primary_position && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500">
                        Primary Position
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        {player.primary_position}
                      </div>
                    </div>
                  )}
                  {player.secondary_position && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500">
                        Secondary Position
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        {player.secondary_position}
                      </div>
                    </div>
                  )}
                  {player.dominant_foot && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500">
                        Dominant Foot
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        {player.dominant_foot}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Coach Notes */}
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Coach Notes
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Personalized feedback from Coach David.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Strengths */}
                  {player.strengths && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="text-sm font-semibold text-emerald-900">
                        Strengths
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-700">
                        {player.strengths}
                      </p>
                    </div>
                  )}

                  {/* Focus Areas */}
                  {player.focus_areas && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                      <div className="text-sm font-semibold text-amber-900">
                        Focus Areas
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-700">
                        {player.focus_areas}
                      </p>
                    </div>
                  )}

                  {/* Long-term Development */}
                  {player.long_term_development_notes && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                      <div className="text-sm font-semibold text-blue-900">
                        Long-term Development
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-700">
                        {player.long_term_development_notes}
                      </p>
                    </div>
                  )}

                  {/* Empty state */}
                  {!player.strengths &&
                    !player.focus_areas &&
                    !player.long_term_development_notes && (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
                        <p className="text-sm text-gray-500">
                          No coach notes yet. Check back after your next session!
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          <PlayerFeedbackSection playerId={player.id} isAdminMode />

          {/* Section 2: Tabbed Content */}
          <PlayerContentTabs playerId={player.id} isAdminMode={true} />
        </div>
      </main>

      <ChatWrapper playerId={player.id} playerName={player.name} />
    </div>
  );
}
