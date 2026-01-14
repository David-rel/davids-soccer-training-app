import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { sql } from "@/db";
import { SignOutButton } from "@/app/ui/SignOutButton";
import { PlayerEditor } from "@/app/player/[playerId]/ui/PlayerEditor";
import { PlayerInsights } from "@/app/player/[playerId]/ui/PlayerInsights";
import { PlayerGoals } from "@/app/player/[playerId]/ui/PlayerGoals";
import { PlayerSessions } from "@/app/player/[playerId]/ui/PlayerSessions";
import { PlayerVideos } from "@/app/player/[playerId]/ui/PlayerVideos";
import { PinnedVideosByCoach } from "@/app/player/[playerId]/ui/PinnedVideosByCoach";

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
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
              <PlayerEditor player={player} />
            </div>

            <PlayerSessions playerId={player.id} />

            <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
              <PlayerInsights playerId={player.id} />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">
                Coach notes
              </div>
              <p className="mt-1 text-sm text-gray-600">
                These sections are set by Coach David.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    Strengths
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {player.strengths ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    Focus areas
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {player.focus_areas ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    Long-term development notes
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {player.long_term_development_notes ?? "—"}
                  </div>
                </div>
              </div>
            </div>

            <PlayerGoals playerId={player.id} />

            <PinnedVideosByCoach playerId={player.id} />

            <PlayerVideos playerId={player.id} />

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-gray-700 shadow-sm">
              Player profiles are created by Coach David. Parents can edit basic
              profile info, but cannot add new players.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
