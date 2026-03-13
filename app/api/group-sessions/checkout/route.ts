import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { sql } from "@/db";
import {
  createPlayerSignup,
  getGroupSessionById,
  provisionParentAndPlayerForGroupSignup,
  updatePlayerSignupsCheckout,
} from "@/lib/groupSessions";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
const GROUP_TIME_ZONE = "America/Phoenix";

type CheckoutBody = {
  groupSessionId?: number | string;
  playerIds?: string[];
  emergencyContact?: string;
  contactPhone?: string;
  contactEmail?: string;
};

type ParentRow = {
  email: string | null;
  phone: string | null;
  name: string | null;
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
};

type PaidSignupRow = {
  first_name: string | null;
  last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  emergency_contact: string | null;
};

function cleanText(input: unknown) {
  return (input || "").toString().trim();
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function getSessionIdFromPath(pathname: string) {
  const match = pathname.match(/\/group-sessions\/(\d+)(?:\/)?$/);
  if (!match) return null;
  return Number(match[1]);
}

function parseGroupSessionInput(input: unknown) {
  const raw = cleanText(input);
  if (!raw) return null;

  const fromRaw = Number(raw);
  if (Number.isInteger(fromRaw) && fromRaw > 0) {
    return fromRaw;
  }

  try {
    const url = new URL(raw);
    return getSessionIdFromPath(url.pathname);
  } catch {
    return null;
  }
}

function splitPlayerName(name: string) {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = cleaned.split(" ");
  return { firstName, lastName: rest.join(" ") };
}

function calculateAgeFromBirthdate(birthdate: string | null) {
  if (!birthdate) return null;

  const parsed = new Date(`${birthdate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  const now = new Date();
  let age = now.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - parsed.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && now.getUTCDate() < parsed.getUTCDate())
  ) {
    age -= 1;
  }

  if (!Number.isInteger(age) || age < 1 || age > 99) return null;
  return age;
}

function addMinutes(input: string | Date, minutes: number) {
  return new Date(new Date(input).getTime() + minutes * 60_000);
}

function formatTimeRange(startInput: string, endInput: string | null) {
  const start = new Date(startInput);
  const end = endInput ? new Date(endInput) : addMinutes(start, 75);
  const format = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: GROUP_TIME_ZONE,
  });
  return `${format.format(start)} - ${format.format(end)}`;
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const parentId = authSession.user.id;

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }
    const stripe = getStripe();

    const body = (await request.json()) as CheckoutBody;
    const groupSessionId = parseGroupSessionInput(body.groupSessionId);

    if (groupSessionId === null || !Number.isInteger(groupSessionId) || groupSessionId <= 0) {
      return NextResponse.json(
        { error: "Invalid group session id" },
        { status: 400 }
      );
    }

    const rawPlayerIds = Array.isArray(body.playerIds) ? body.playerIds : [];
    const playerIds = Array.from(
      new Set(rawPlayerIds.map((id) => cleanText(id)).filter(Boolean))
    );

    if (playerIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one player for signup" },
        { status: 400 }
      );
    }

    const parentRows = (await sql`
      SELECT email, phone, name
      FROM parents
      WHERE id = ${parentId}
      LIMIT 1
    `) as unknown as ParentRow[];

    const parent = parentRows[0];
    if (!parent) {
      return NextResponse.json({ error: "Parent account not found" }, { status: 404 });
    }

    const emergencyContact = cleanText(body.emergencyContact || parent.name || "Parent");
    const contactPhone = cleanText(body.contactPhone || parent.phone || "");
    const contactEmail = cleanText(body.contactEmail || parent.email || "").toLowerCase();

    if (!emergencyContact || !contactEmail) {
      return NextResponse.json(
        { error: "Emergency contact and contact email are required" },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json(
        { error: "A valid contact email is required" },
        { status: 400 }
      );
    }

    const session = await getGroupSessionById(groupSessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (new Date(session.session_date).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Session has already passed" },
        { status: 400 }
      );
    }

    if (session.spots_left <= 0) {
      return NextResponse.json(
        { error: "This session is fully booked" },
        { status: 400 }
      );
    }

    if (playerIds.length > session.spots_left) {
      return NextResponse.json(
        {
          error: `Only ${session.spots_left} ${
            session.spots_left === 1 ? "spot is" : "spots are"
          } left for this session`,
        },
        { status: 400 }
      );
    }

    const price = Number(session.price || 0);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Session price is not configured" },
        { status: 400 }
      );
    }

    const allPlayers = (await sql`
      SELECT
        id,
        name,
        birthdate::text AS birthdate,
        age::int AS age,
        dominant_foot,
        team_level,
        focus_areas,
        long_term_development_notes
      FROM players
      WHERE parent_id = ${parentId}
      ORDER BY created_at ASC
    `) as unknown as PlayerRow[];

    const playerIdSet = new Set(playerIds);
    const selectedPlayers = allPlayers.filter((player) => playerIdSet.has(player.id));

    if (selectedPlayers.length !== playerIds.length) {
      return NextResponse.json(
        { error: "One or more selected players could not be found" },
        { status: 400 }
      );
    }

    const playersMissingAge = selectedPlayers
      .filter((player) => {
        const ageFromBirthdate = calculateAgeFromBirthdate(player.birthdate);
        const ageFromField =
          Number.isInteger(player.age) && player.age !== null && player.age > 0
            ? player.age
            : null;
        return ageFromBirthdate === null && ageFromField === null;
      })
      .map((player) => player.name);

    if (playersMissingAge.length > 0) {
      return NextResponse.json(
        {
          error: `Missing birthday/age for: ${playersMissingAge.join(", ")}. Update player profile first.`,
        },
        { status: 400 }
      );
    }

    const existingPaidSignups = (await sql`
      SELECT
        first_name,
        last_name,
        contact_email,
        contact_phone,
        emergency_contact
      FROM player_signups
      WHERE group_session_id = ${groupSessionId}
        AND has_paid = true
    `) as unknown as PaidSignupRow[];

    const selectedNamePairs = new Set<string>();
    for (const player of selectedPlayers) {
      const split = splitPlayerName(player.name);
      const first = normalizeText(split.firstName);
      const last = normalizeText(split.lastName);
      if (!first) continue;
      selectedNamePairs.add(`${first}|${last}`);
      if (!last) selectedNamePairs.add(`${first}|player`);
    }
    const parentEmail = normalizeText(contactEmail);
    const parentPhoneDigits = normalizeDigits(contactPhone || parent.phone);
    const parentName = normalizeText(emergencyContact || parent.name);

    const alreadyPaidPlayerNames = Array.from(
      new Set(
        existingPaidSignups
          .map((signup) => {
            const signupFirst = normalizeText(signup.first_name);
            const signupLast = normalizeText(signup.last_name);
            const signupPair = `${signupFirst}|${signupLast}`;
            if (!selectedNamePairs.has(signupPair)) return null;

            const signupEmail = normalizeText(signup.contact_email);
            const signupPhoneDigits = normalizeDigits(signup.contact_phone);
            const emergencyContactText = normalizeText(signup.emergency_contact);
            const emergencyContactDigits = normalizeDigits(signup.emergency_contact);

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
            return `${signup.first_name ?? ""} ${signup.last_name ?? ""}`.trim();
          })
          .filter((name): name is string => Boolean(name))
      )
    );

    if (alreadyPaidPlayerNames.length > 0) {
      return NextResponse.json(
        {
          error: `Already signed up: ${alreadyPaidPlayerNames.join(
            ", "
          )}. Email davidfalesct@gmail.com to cancel/reschedule.`,
        },
        { status: 409 }
      );
    }

    const crmContextNote = `Session booked via group checkout (${session.title} on ${new Date(
      session.session_date
    ).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: GROUP_TIME_ZONE,
    })})`;

    const signupIds: number[] = [];
    const playerNames: string[] = [];
    let parentPortalEmail = parent.email?.trim().toLowerCase() || contactEmail;
    let generatedPassword: string | null = null;
    let parentWasCreated = false;

    for (const player of selectedPlayers) {
      const { firstName, lastName } = splitPlayerName(player.name);
      if (!firstName) {
        return NextResponse.json(
          { error: `Player name is required for ${player.id}` },
          { status: 400 }
        );
      }

      const age = calculateAgeFromBirthdate(player.birthdate) ?? player.age;
      if (!age || age < 1 || age > 99) {
        return NextResponse.json(
          { error: `A valid age is required for ${player.name}` },
          { status: 400 }
        );
      }

      const notes = cleanText(player.focus_areas || player.long_term_development_notes || "");

      const accountProvision = await provisionParentAndPlayerForGroupSignup({
        existingParentId: parentId,
        contactEmail,
        contactPhone: contactPhone || null,
        parentName: emergencyContact || null,
        firstName,
        lastName: lastName || "Player",
        playerAge: age,
        playerBirthdate: player.birthdate,
        foot: player.dominant_foot || null,
        team: player.team_level || null,
        notes: notes || null,
        crmContextNote,
      });

      if (!generatedPassword && accountProvision.generatedPassword) {
        generatedPassword = accountProvision.generatedPassword;
      }
      parentWasCreated = parentWasCreated || accountProvision.parentWasCreated;
      parentPortalEmail = accountProvision.parentEmail || parentPortalEmail;

      const signup = await createPlayerSignup({
        group_session_id: groupSessionId,
        first_name: firstName,
        last_name: lastName || "Player",
        emergency_contact: emergencyContact,
        contact_phone: contactPhone || null,
        contact_email: contactEmail,
        birthday: player.birthdate,
        foot: player.dominant_foot || null,
        team: player.team_level || null,
        notes: notes || null,
      });

      signupIds.push(signup.id);
      playerNames.push(player.name);
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${siteUrl}/group-sessions/${session.id}?checkout=success`,
      cancel_url: `${siteUrl}/group-sessions/${session.id}?checkout=cancelled`,
      customer_email: contactEmail,
      line_items: [
        {
          quantity: selectedPlayers.length,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(price * 100),
            product_data: {
              name: session.title,
              description: `${new Date(session.session_date).toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: GROUP_TIME_ZONE,
              })} (${formatTimeRange(session.session_date, session.session_date_end)})${
                session.location ? ` • ${session.location}` : ""
              }`,
            },
          },
        },
      ],
      metadata: {
        group_session_id: String(session.id),
        player_signup_ids: signupIds.join(","),
        player_count: String(selectedPlayers.length),
        parent_portal_email: parentPortalEmail,
        parent_portal_password: generatedPassword || "",
        parent_portal_is_new: parentWasCreated ? "true" : "false",
      },
    });

    await updatePlayerSignupsCheckout(
      signupIds,
      checkoutSession.id,
      typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : null
    );

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Failed to create checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        checkoutUrl: checkoutSession.url,
        signupCount: selectedPlayers.length,
        playerNames,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to create checkout session", error);
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 }
    );
  }
}
