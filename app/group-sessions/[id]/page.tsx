import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { ParentPortalHeader } from "@/app/ui/ParentPortalHeader";
import { PublicSiteHeader } from "@/app/ui/PublicSiteHeader";
import { authOptions } from "@/lib/auth";
import { sql } from "@/db";
import { getGroupSessionById } from "@/lib/groupSessions";
import {
  formatUsdPrice,
  GROUP_SESSION_PRIVATE_SIGNUP_PRICE,
  GROUP_SESSION_STANDARD_SIGNUP_PRICE,
} from "@/lib/groupSessionPricing";

import CheckoutStatusModal from "./CheckoutStatusModal";
import GuestSessionSignupForm from "./GuestSessionSignupForm";
import SessionCheckoutForm from "./SessionCheckoutForm";

export const dynamic = "force-dynamic";
const GROUP_TIME_ZONE = "America/Phoenix";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ParentRow = {
  email: string | null;
  phone: string | null;
  name: string | null;
  is_admin: boolean;
};

type PlayerRow = {
  id: string;
  name: string;
  birthdate: string | null;
  age: number | null;
  dominant_foot: string | null;
  team_level: string | null;
  focus_areas: string | null;
  long_term_development_notes: string | null;
  in_privates: boolean;
};

type PaidSignupRow = {
  first_name: string | null;
  last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  emergency_contact: string | null;
};

function formatSessionDate(input: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: GROUP_TIME_ZONE,
  }).format(new Date(input));
}

function addMinutes(input: string | Date, minutes: number) {
  return new Date(new Date(input).getTime() + minutes * 60_000);
}

function formatSessionTimeRange(startInput: string, endInput: string | null) {
  const start = new Date(startInput);
  const end = endInput ? new Date(endInput) : addMinutes(start, 75);
  const format = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: GROUP_TIME_ZONE,
  });
  return `${format.format(start)} - ${format.format(end)}`;
}

function formatSpotsRemaining(spots: number) {
  return `${spots} ${spots === 1 ? "spot" : "spots"} remaining`;
}

function splitPlayerName(name: string) {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = cleaned.split(" ");
  return { firstName, lastName: rest.join(" ") };
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export default async function GroupSessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const sessionId = Number(id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    notFound();
  }

  const session = await getGroupSessionById(sessionId);

  if (!session) {
    notFound();
  }

  const authSession = await getServerSession(authOptions);
  const parentId = authSession?.user?.id ?? null;

  let parent: ParentRow = {
    email: null,
    phone: null,
    name: null,
    is_admin: false,
  };
  let players: PlayerRow[] = [];
  let alreadySignedPlayerIds: string[] = [];

  if (parentId) {
    const parentRows = (await sql`
      SELECT email, phone, name, is_admin
      FROM parents
      WHERE id = ${parentId}
      LIMIT 1
    `) as unknown as ParentRow[];
    parent = parentRows[0] ?? parent;

    players = (await sql`
      SELECT
        id,
        name,
        birthdate::text AS birthdate,
        age::int AS age,
        dominant_foot,
        team_level,
        focus_areas,
        long_term_development_notes,
        in_privates
      FROM players
      WHERE parent_id = ${parentId}
      ORDER BY created_at ASC
    `) as unknown as PlayerRow[];

    const paidSignups = (await sql`
      SELECT
        first_name,
        last_name,
        contact_email,
        contact_phone,
        emergency_contact
      FROM player_signups
      WHERE group_session_id = ${session.id}
        AND has_paid = true
    `) as unknown as PaidSignupRow[];

    const playerFullNameToId = new Map(
      players.map((player) => [normalizeText(player.name), player.id] as const)
    );
    const playerFirstLastToId = new Map<string, string>();
    for (const player of players) {
      const split = splitPlayerName(player.name);
      const first = normalizeText(split.firstName);
      const last = normalizeText(split.lastName);
      if (!first) continue;
      playerFirstLastToId.set(`${first}|${last}`, player.id);
      if (!last) playerFirstLastToId.set(`${first}|player`, player.id);
    }

    const parentEmail = normalizeText(parent.email);
    const parentPhoneDigits = normalizeDigits(parent.phone);
    const parentName = normalizeText(parent.name);

    alreadySignedPlayerIds = Array.from(
      new Set(
        paidSignups
          .map((signup) => {
            const signupEmail = normalizeText(signup.contact_email);
            const signupPhoneDigits = normalizeDigits(signup.contact_phone);
            const emergencyContactText = normalizeText(signup.emergency_contact);
            const emergencyContactDigits = normalizeDigits(signup.emergency_contact);
            const signupFirst = normalizeText(signup.first_name);
            const signupLast = normalizeText(signup.last_name);
            const signupFull = normalizeText(
              `${signup.first_name ?? ""} ${signup.last_name ?? ""}`
            );

            const emailMatch = Boolean(parentEmail && signupEmail === parentEmail);
            const phoneMatch = Boolean(
              parentPhoneDigits &&
                (signupPhoneDigits === parentPhoneDigits ||
                  emergencyContactDigits.includes(parentPhoneDigits))
            );
            const parentNameMatch = Boolean(
              parentName && emergencyContactText.includes(parentName)
            );

            if (!emailMatch && !phoneMatch && !parentNameMatch) return null;

            return (
              playerFullNameToId.get(signupFull) ||
              playerFirstLastToId.get(`${signupFirst}|${signupLast}`) ||
              null
            );
          })
          .filter((playerId): playerId is string => Boolean(playerId))
      )
    );
  }

  const isFull = session.spots_left <= 0;
  const callbackUrl = `/group-sessions/${session.id}`;
  const hasPrivatePackagePlayer = players.some((player) => player.in_privates);

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-emerald-50">
      {parentId ? (
        <ParentPortalHeader
          title="Group session signup"
          subtitle="Review session details, then complete checkout."
          isAdmin={parent.is_admin}
          email={parent.email}
          phone={parent.phone}
        />
      ) : (
        <PublicSiteHeader callbackUrl={callbackUrl} />
      )}

      <CheckoutStatusModal />

      <section className="py-14 md:py-20 px-6 bg-linear-to-b from-emerald-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <Link
            href={parentId ? "/players" : "/"}
            className="inline-flex items-center text-emerald-700 font-semibold hover:text-emerald-800 transition-colors"
          >
            {parentId ? "← Back to your players" : "← Back to upcoming sessions"}
          </Link>

          <div className="grid lg:grid-cols-2 gap-8 mt-6">
            <div className="bg-white rounded-3xl border-2 border-emerald-100 shadow-xl p-6 md:p-8">
              {session.image_url ? (
                <div className="aspect-video rounded-2xl overflow-hidden mb-6 bg-emerald-50 border border-emerald-100">
                  <img
                    src={session.image_url}
                    alt={session.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              <p className="text-emerald-700 font-semibold">Session #{session.id}</p>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mt-2 mb-4">
                {session.title}
              </h1>

              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                {session.description || "No description posted yet."}
              </p>

              <div className="space-y-3 text-gray-800">
                <p>
                  <span className="font-semibold">Date:</span> {formatSessionDate(session.session_date)}
                </p>
                <p>
                  <span className="font-semibold">Time:</span>{" "}
                  {formatSessionTimeRange(session.session_date, session.session_date_end)}
                </p>
                <p>
                  <span className="font-semibold">Location:</span> {session.location || "TBD"}
                </p>
                <p>
                  <span className="font-semibold">Price:</span>{" "}
                  {hasPrivatePackagePlayer ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="line-through text-gray-500">
                        {formatUsdPrice(GROUP_SESSION_STANDARD_SIGNUP_PRICE)}
                      </span>
                      <span className="font-semibold text-emerald-700">
                        {formatUsdPrice(GROUP_SESSION_PRIVATE_SIGNUP_PRICE)}
                      </span>
                    </span>
                  ) : (
                    `${formatUsdPrice(GROUP_SESSION_STANDARD_SIGNUP_PRICE)} per signup`
                  )}
                </p>
                <p className="text-sm text-emerald-700">
                  Players in a private package pay{" "}
                  <span className="font-semibold">
                    {formatUsdPrice(GROUP_SESSION_PRIVATE_SIGNUP_PRICE)}
                  </span>{" "}
                  per signup.
                </p>
                <p>{formatSpotsRemaining(session.spots_left)}</p>
              </div>

              {session.curriculum ? (
                <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <p className="text-sm font-semibold text-emerald-700 mb-1">Curriculum</p>
                  <p className="text-gray-700">{session.curriculum}</p>
                </div>
              ) : null}
            </div>

            <div>
              {parentId ? (
                <SessionCheckoutForm
                  sessionId={session.id}
                  isFull={isFull}
                  spotsLeft={session.spots_left}
                  players={players}
                  alreadySignedPlayerIds={alreadySignedPlayerIds}
                  defaultEmergencyContact={parent.name ?? ""}
                  defaultContactEmail={parent.email ?? ""}
                  defaultContactPhone={parent.phone ?? ""}
                />
              ) : (
                <GuestSessionSignupForm
                  sessionId={session.id}
                  isFull={isFull}
                  spotsLeft={session.spots_left}
                  sessionPrice={GROUP_SESSION_STANDARD_SIGNUP_PRICE}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
