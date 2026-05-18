import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { sql } from "@/db";
import { SignOutButton } from "@/app/ui/SignOutButton";
import { calculateAgeFromBirthdate } from "@/lib/playerAge";
import { ChatWrapper } from "@/app/player/[playerId]/ui/ChatWrapper";
import { PlayerSidebar } from "@/app/player/[playerId]/ui/PlayerSidebar";

type PlayerRow = {
  id: string;
  name: string;
  birthdate: string | null;
  team_level: string | null;
  primary_position: string | null;
  profile_photo_url: string | null;
};

function playerInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function PlayerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ playerId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const { playerId } = await params;
  const isAdmin = session.user.isAdmin === true;

  const rows = (await sql`
    SELECT id, name, birthdate::text AS birthdate, team_level, primary_position, profile_photo_url
    FROM players
    WHERE id = ${playerId}
      AND (${isAdmin} OR parent_id = ${session.user.id})
    LIMIT 1
  `) as unknown as PlayerRow[];

  const player = rows[0];
  if (!player) redirect(isAdmin ? "/admin/players" : "/players");

  const age = calculateAgeFromBirthdate(player.birthdate);
  const initials = playerInitials(player.name);

  const pills = [
    player.team_level,
    player.primary_position,
    age !== null ? `Age ${age}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-linear-to-r from-emerald-600 to-emerald-700">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Image
                src="/icon.png"
                alt="David's Soccer Training"
                width={44}
                height={44}
                className="hidden h-11 w-11 rounded-xl bg-white p-1.5 sm:block"
                priority
              />

              {player.profile_photo_url ? (
                <Image
                  src={player.profile_photo_url}
                  alt={player.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border-2 border-white/40 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30 bg-white/20">
                  <span className="text-xl font-bold text-white">
                    {initials}
                  </span>
                </div>
              )}

              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">
                  {player.name}
                </h1>
                {pills.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {pills.map((pill) => (
                      <span
                        key={pill}
                        className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white"
                      >
                        {pill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/players"
                className="rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                ← Players
              </Link>
              <SignOutButton className="rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60" />
            </div>
          </div>
        </div>
      </header>

      {/* Body: sidebar + page content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex gap-6 lg:gap-8">
          {/* Desktop sidebar — always visible */}
          <aside className="hidden w-48 shrink-0 lg:block">
            <div className="sticky top-6">
              <PlayerSidebar playerId={playerId} />
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            {/* Mobile nav — horizontal scroll */}
            <div className="mb-6 lg:hidden">
              <PlayerSidebar playerId={playerId} mobile />
            </div>

            {children}
          </main>
        </div>
      </div>

      <ChatWrapper playerId={player.id} playerName={player.name} />
    </div>
  );
}
