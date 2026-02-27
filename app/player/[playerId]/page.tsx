import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { sql } from "@/db";
import { SignOutButton } from "@/app/ui/SignOutButton";
import { PlayerEditor } from "@/app/player/[playerId]/ui/PlayerEditor";
import PlayerContentTabs from "@/app/player/[playerId]/ui/PlayerContentTabs";
import { PlayerFeedbackSection } from "@/app/player/[playerId]/ui/PlayerFeedbackSection";
import { ChatWrapper } from "@/app/player/[playerId]/ui/ChatWrapper";

type PlayerRow = {
  id: string;
  parent_id: string;
  name: string;
  birthdate: string | null;
  birth_year: number | null;
  team_level: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  dominant_foot: string | null;
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
  created_at: string;
  updated_at: string;
};

export default async function PlayerPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const { playerId } = await props.params;

  const rows = (await sql`
    SELECT
      id,
      parent_id,
      name,
      birthdate::text AS birthdate,
      birth_year,
      team_level,
      primary_position,
      secondary_position,
      dominant_foot,
      profile_photo_url,
      strengths,
      focus_areas,
      long_term_development_notes,
      first_touch_rating,
      first_touch_notes,
      one_v_one_ability_rating,
      one_v_one_ability_notes,
      passing_technique_rating,
      passing_technique_notes,
      shot_technique_rating,
      shot_technique_notes,
      vision_recognition_rating,
      vision_recognition_notes,
      great_soccer_habits_rating,
      great_soccer_habits_notes,
      created_at,
      updated_at
    FROM players
    WHERE id = ${playerId} AND parent_id = ${session.user.id}
    LIMIT 1
  `) as unknown as PlayerRow[];

  const player = rows[0];
  if (!player) redirect("/players");

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
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />

      <header className="relative bg-linear-to-r from-emerald-600 to-emerald-700">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/icon.png"
                alt="David’s Soccer Training icon"
                width={56}
                height={56}
                className="h-14 w-14 rounded-2xl bg-white p-2"
                priority
              />
              <div>
                <div className="text-sm font-semibold text-emerald-50">
                  David’s Soccer Training
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {player.name}
                </h1>
                <p className="mt-2 text-sm text-emerald-100 sm:text-base">
                  View and edit your player’s details.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/players"
                className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Back to players
              </Link>
              <SignOutButton />
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
                    Update basic profile info.
                  </p>
                </div>
                <PlayerEditor player={player} />
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

          <PlayerFeedbackSection playerId={player.id} />

          {/* Section 2: Tabbed Content */}
          <PlayerContentTabs playerId={player.id} />
        </div>
      </main>

      <ChatWrapper playerId={player.id} playerName={player.name} />
    </div>
  );
}
