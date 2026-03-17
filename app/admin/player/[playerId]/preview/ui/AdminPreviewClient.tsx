"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PlayerContentTabs from "@/app/player/[playerId]/ui/PlayerContentTabs";
import { PlayerFeedbackSection } from "@/app/player/[playerId]/ui/PlayerFeedbackSection";
import { ChatWrapper } from "@/app/player/[playerId]/ui/ChatWrapper";
import type { PointsStateView } from "@/lib/points/types";
import { formatTitleWithOptionalShirt } from "@/lib/points/display";

type Player = {
  id: string;
  name: string;
  birthdate: string | null;
  team_level: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  dominant_foot: string | null;
  shirt_size: string | null;
  location: string | null;
  profile_photo_url: string | null;
  strengths: string | null;
  focus_areas: string | null;
  long_term_development_notes: string | null;
  first_touch_rating: number | null;
  first_touch_notes: string | null;
  one_v_one_ability_rating: number | null;
  one_v_one_ability_notes: string | null;
  passing_technique_rating: number | null;
  passing_technique_notes: string | null;
  shot_technique_rating: number | null;
  shot_technique_notes: string | null;
  vision_recognition_rating: number | null;
  vision_recognition_notes: string | null;
  great_soccer_habits_rating: number | null;
  great_soccer_habits_notes: string | null;
};

export default function AdminPreviewClient(props: {
  params: Promise<{ playerId: string }>;
}) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [pointsState, setPointsState] = useState<PointsStateView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    props.params.then((p) => setPlayerId(p.playerId));
  }, [props.params]);

  const loadData = useCallback(async () => {
    if (!playerId) {
      setError("No player ID found");
      return;
    }
    
    setError(null);
    setLoading(true);
    setPointsState(null);

    try {
      const [playerRes, pointsRes] = await Promise.all([
        fetch(`/api/admin/players/${playerId}`, { cache: "no-store" }),
        fetch(`/api/admin/players/${playerId}/points/state`, { cache: "no-store" }),
      ]);

      if (!playerRes.ok) {
        const text = await playerRes.text();
        throw new Error(`Failed to load player: ${text || playerRes.status}`);
      }

      const playerData = await playerRes.json();
      setPlayer(playerData.player);

      if (pointsRes.ok) {
        const pointsPayload = (await pointsRes.json()) as PointsStateView;
        setPointsState(pointsPayload);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    if (!playerId) return;
    void loadData();
  }, [loadData, playerId]);

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

  const skillRatings = [
    {
      label: "First Touch",
      rating: player.first_touch_rating,
      notes: player.first_touch_notes,
    },
    {
      label: "1v1 Ability",
      rating: player.one_v_one_ability_rating,
      notes: player.one_v_one_ability_notes,
    },
    {
      label: "Passing Technique",
      rating: player.passing_technique_rating,
      notes: player.passing_technique_notes,
    },
    {
      label: "Shot Technique",
      rating: player.shot_technique_rating,
      notes: player.shot_technique_notes,
    },
    {
      label: "Vision / Recognition",
      rating: player.vision_recognition_rating,
      notes: player.vision_recognition_notes,
    },
    {
      label: "Great Soccer Habits",
      rating: player.great_soccer_habits_rating,
      notes: player.great_soccer_habits_notes,
    },
  ];

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
                  David&apos;s Soccer Training
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
                href={`/admin/player/${playerId}/preview/shop`}
                className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
              >
                Shop preview
              </Link>
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
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Player Progression
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Read-only points snapshot for this player.
                </p>
              </div>
              <Link
                href={`/admin/player/${playerId}/preview/shop`}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                Open shop preview
              </Link>
            </div>

            {pointsState ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PreviewMetric
                  label="Title"
                  value={formatTitleWithOptionalShirt({
                    titleLevel: pointsState.titleLevel,
                    shirtLevel: pointsState.shirtLevel,
                  })}
                />
                <PreviewMetric label="XP" value={String(pointsState.trainingXp)} />
                <PreviewMetric label="Credits" value={String(pointsState.credits)} />
                <PreviewMetric
                  label="Weekly Remaining"
                  value={`${pointsState.weeklyNonSessionRemaining}/${pointsState.weeklyNonSessionCap}`}
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-600">Progression unavailable.</p>
            )}
          </section>

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
                  {player.shirt_size && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500">
                        Shirt Size
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        {player.shirt_size}
                      </div>
                    </div>
                  )}
                  {player.location && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500">
                        Location
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        {player.location}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        General area only, for travel planning.
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

                  {/* General soccer skills (1-5 + notes) */}
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                    <div className="text-sm font-semibold text-gray-900">
                      General Soccer Skills
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Skill score (1-5) and coach notes.
                    </p>
                    <p className="mt-2 text-xs text-gray-600">
                      Ratings show current stage and next steps. A lower number
                      means we are building a stronger foundation, not failure.
                    </p>
                    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Grading Key
                      </div>
                      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-gray-700">
                        <li>
                          <span className="font-semibold">1:</span> Reviewing
                          basics and footwork foundation.
                        </li>
                        <li>
                          <span className="font-semibold">2:</span> Needs
                          refining; understands the move but needs more reps.
                        </li>
                        <li>
                          <span className="font-semibold">3:</span> Good
                          execution; basic footwork is showing consistently.
                        </li>
                        <li>
                          <span className="font-semibold">4:</span> Above
                          average in most situations.
                        </li>
                        <li>
                          <span className="font-semibold">5:</span> Excellent,
                          game-quality execution at speed.
                        </li>
                      </ul>
                    </div>
                    <div className="mt-4 space-y-3">
                      {skillRatings.map((skill) => (
                        <div
                          key={skill.label}
                          className="rounded-xl border border-gray-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-gray-900">
                              {skill.label}
                            </div>
                            <div className="text-xs font-semibold text-emerald-700">
                              {skill.rating !== null
                                ? `${skill.rating} / 5`
                                : "No rating"}
                            </div>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-gray-700">
                            {skill.notes?.trim() || "No notes yet."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
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

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-600">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
