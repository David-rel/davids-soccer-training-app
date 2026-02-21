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
      created_at,
      updated_at
    FROM players
    WHERE id = ${playerId} AND parent_id = ${session.user.id}
    LIMIT 1
  `) as unknown as PlayerRow[];

  const player = rows[0];
  if (!player) redirect("/players");

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

          <PlayerFeedbackSection playerId={player.id} />

          {/* Section 2: Tabbed Content */}
          <PlayerContentTabs playerId={player.id} />
        </div>
      </main>

      <ChatWrapper playerId={player.id} playerName={player.name} />
    </div>
  );
}
