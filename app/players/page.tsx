import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { sql } from "@/db";
import { SignOutButton } from "@/app/ui/SignOutButton";
import Image from "next/image";
import Link from "next/link";
import { ageGroupFromAge, calculateAgeFromBirthdate } from "@/lib/playerAge";
import { ParentAccountSettings } from "@/app/players/ui/ParentAccountSettings";

type PlayerRow = {
  id: string;
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

export default async function PlayersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const parentId = session.user.id;
  if (!parentId) redirect("/");

  const parentRows = (await sql`
    SELECT email, phone
    FROM parents
    WHERE id = ${parentId}
    LIMIT 1
  `) as unknown as { email: string | null; phone: string | null }[];
  const parent = parentRows[0] ?? { email: null, phone: null };

  const players = (await sql`
    SELECT
      id,
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
    WHERE parent_id = ${parentId}
    ORDER BY created_at DESC
  `) as unknown as PlayerRow[];

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
                  Your players
                </h1>
                <p className="mt-2 text-sm text-emerald-100 sm:text-base">
                  Tap a player to view and edit details.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-emerald-200/30 bg-white/10 px-4 py-2 text-sm text-emerald-50 sm:block">
                Parent portal
              </div>
              <ParentAccountSettings
                initialEmail={parent.email}
                initialPhone={parent.phone}
              />
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Player profiles
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Player profiles are created by Coach David. You can edit player
              details here.
            </p>
          </div>
        </div>

        {players.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            No players yet. Player profiles are created by Coach David after
            your private session.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p) => (
              <Link
                key={p.id}
                href={`/player/${p.id}`}
                className="group rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-gray-900">
                      {p.name}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {p.team_level ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Edit
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Positions</span>
                    <span className="font-medium text-gray-800">
                      {p.primary_position ?? "—"}
                      {p.secondary_position ? ` / ${p.secondary_position}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Age</span>
                    <span className="font-medium text-gray-800">
                      {calculateAgeFromBirthdate(p.birthdate) ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Birth year</span>
                    <span className="font-medium text-gray-800">
                      {(p.birthdate
                        ? Number(p.birthdate.slice(0, 4))
                        : p.birth_year) ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Age group</span>
                    <span className="font-medium text-gray-800">
                      {ageGroupFromAge(
                        calculateAgeFromBirthdate(p.birthdate)
                      ) ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Foot</span>
                    <span className="font-medium text-gray-800">
                      {p.dominant_foot ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Click to view full profile
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
