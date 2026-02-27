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

type GroupSessionRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  session_date: string;
  session_date_end: string | null;
  location: string | null;
  price: string | null;
  curriculum: string | null;
  max_players: number;
  signup_count: number;
};

type ParentRow = {
  email: string | null;
  phone: string | null;
  name: string | null;
  is_admin: boolean;
};

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatSessionStart(value: string | null) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value: string | null) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPrice(value: string | null) {
  if (!value) return "—";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
}

function formatTimeRange(start: string | null, end: string | null) {
  const startTime = formatTime(start);
  const endTime = formatTime(end);
  if (startTime === "—" && endTime === "—") return "—";
  if (endTime === "—") return startTime;
  return `${startTime} - ${endTime}`;
}

function splitPlayerName(name: string) {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = cleaned.split(" ");
  return { firstName, lastName: rest.join(" ") };
}

function setParamIfPresent(
  params: URLSearchParams,
  key: string,
  value: string | null | undefined
) {
  const v = String(value ?? "").trim();
  if (v) params.set(key, v);
}

function buildGroupSessionUrl(
  sessionId: string,
  parent: ParentRow,
  player: PlayerRow | null
) {
  const params = new URLSearchParams();

  if (player) {
    const { firstName, lastName } = splitPlayerName(player.name);
    setParamIfPresent(params, "kidFirstName", firstName);
    setParamIfPresent(params, "kidLastName", lastName);
    setParamIfPresent(params, "birthday", player.birthdate);
    setParamIfPresent(params, "preferredFoot", player.dominant_foot);
    setParamIfPresent(params, "team", player.team_level);
    setParamIfPresent(
      params,
      "notes",
      player.focus_areas ?? player.long_term_development_notes
    );
  }

  setParamIfPresent(params, "parentName", parent.name);
  setParamIfPresent(params, "email", parent.email);
  setParamIfPresent(params, "phone", parent.phone);

  const query = params.toString();
  const base = `https://www.davidssoccertraining.com/group-sessions/${sessionId}`;
  return query ? `${base}?${query}` : base;
}

export default async function PlayersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const parentId = session.user.id;
  if (!parentId) redirect("/");

  const parentRows = (await sql`
    SELECT email, phone, name, is_admin
    FROM parents
    WHERE id = ${parentId}
    LIMIT 1
  `) as unknown as ParentRow[];
  const parent = parentRows[0] ?? {
    email: null,
    phone: null,
    name: null,
    is_admin: false,
  };

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

  const groupSessions = (await sql`
    SELECT
      gs.id::text AS id,
      gs.title,
      gs.description,
      gs.image_url,
      gs.session_date::text AS session_date,
      gs.session_date_end::text AS session_date_end,
      gs.location,
      gs.price::text AS price,
      gs.curriculum,
      gs.max_players,
      COUNT(ps.id)::int AS signup_count
    FROM group_sessions gs
    LEFT JOIN player_signups ps ON ps.group_session_id = gs.id
    WHERE COALESCE(gs.session_date_end, gs.session_date) >= NOW()
    GROUP BY
      gs.id,
      gs.title,
      gs.description,
      gs.image_url,
      gs.session_date,
      gs.session_date_end,
      gs.location,
      gs.price,
      gs.curriculum,
      gs.max_players,
      gs.created_at
    ORDER BY gs.session_date ASC, gs.created_at ASC
  `) as unknown as GroupSessionRow[];
  const playerForSignup = players[0] ?? null;

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
              {parent.is_admin && (
                <Link
                  href="/admin"
                  className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  View admin
                </Link>
              )}
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

        <section className="mt-10">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Upcoming Group Sessions
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Group sessions help players train with game-like intensity, build
              confidence with teammates, and get more quality repetitions. Try
              one out with David’s Soccer Training.
            </p>
          </div>

          {groupSessions.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
              No upcoming group sessions are posted yet. Check back soon.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groupSessions.map((groupSession) => (
                <Link
                  key={groupSession.id}
                  href={buildGroupSessionUrl(
                    groupSession.id,
                    parent,
                    playerForSignup
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-3xl border border-emerald-300 bg-emerald-500 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                >
                  {groupSession.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={groupSession.image_url}
                      alt={groupSession.title}
                      className="h-52 w-full bg-white object-contain p-6"
                    />
                  ) : (
                    <div className="flex h-52 w-full items-center justify-center bg-white p-6">
                      <Image
                        src="/icon.png"
                        alt="David's Soccer Training"
                        width={200}
                        height={200}
                        className="h-28 w-28 object-contain"
                      />
                    </div>
                  )}

                  <div className="bg-emerald-500 p-6 text-emerald-50">
                    <h3 className="text-2xl font-bold leading-tight text-white">
                      {groupSession.title}
                    </h3>
                    <div className="mt-4 space-y-2 text-base leading-snug text-emerald-50/95">
                      <p>
                        <span className="font-semibold text-white">When:</span>{" "}
                        {formatSessionStart(groupSession.session_date)}
                      </p>
                      <p>
                        <span className="font-semibold text-white">Time:</span>{" "}
                        {formatTimeRange(
                          groupSession.session_date,
                          groupSession.session_date_end
                        )}
                      </p>
                      <p>
                        <span className="font-semibold text-white">
                          Location:
                        </span>{" "}
                        {groupSession.location ?? "TBD"}
                      </p>
                      <p>
                        <span className="font-semibold text-white">Price:</span>{" "}
                        {formatPrice(groupSession.price)}
                      </p>
                      <p className="text-white">
                        {groupSession.max_players > 0
                          ? `${Math.max(
                              groupSession.max_players - groupSession.signup_count,
                              0
                            )} spots remaining`
                          : "Open enrollment"}
                      </p>
                    </div>

                    {groupSession.curriculum ? (
                      <p className="mt-4 text-sm leading-snug text-emerald-50/95">
                        Focus: {groupSession.curriculum}
                      </p>
                    ) : null}

                    <div className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-lg font-bold text-emerald-900 transition group-hover:bg-emerald-50">
                      View Details &amp; Sign Up
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
