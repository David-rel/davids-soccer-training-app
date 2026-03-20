import bcrypt from "bcryptjs";
import crypto from "crypto";

import { sql } from "@/db";
import { normalizePhoneForStorage } from "@/lib/phone";

const PORTAL_PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export type GroupSessionWithAvailability = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  session_date: string;
  session_date_end: string | null;
  location: string | null;
  price: number | null;
  curriculum: string | null;
  max_players: number;
  paid_signups: number;
  spots_left: number;
};

export type GroupSignupProvisionResult = {
  parentId: string;
  playerId: string;
  parentEmail: string;
  parentWasCreated: boolean;
  generatedPassword: string | null;
};

export type PaidPlayerSignup = {
  id: number;
  group_session_id: number;
  first_name: string;
  last_name: string;
  emergency_contact: string;
  contact_phone: string | null;
  contact_email: string;
};

type GroupSessionRaw = {
  id: number | string;
  title: string;
  description: string | null;
  image_url: string | null;
  session_date: string;
  session_date_end: string | null;
  location: string | null;
  price: number | string | null;
  curriculum: string | null;
  max_players: number | string;
  paid_signups: number | string;
  spots_left: number | string;
};

function cleanNullableText(input: string | null | undefined) {
  const value = (input || "").trim();
  return value || null;
}

function appendCrmNote(existingNote: string | null, noteEntry: string | null) {
  const existing = cleanNullableText(existingNote);
  const entry = cleanNullableText(noteEntry);

  if (!entry) return existing;
  if (!existing) return entry;
  if (existing.toLowerCase().includes(entry.toLowerCase())) return existing;

  return `${existing}\n${entry}`;
}

function buildPlayerCrmNoteEntry(params: {
  contextNote: string | null;
  playerName: string;
  playerBirthdate: string | null;
  playerAge: number;
  teamLevel: string | null;
  dominantFoot: string | null;
  developmentNotes: string | null;
}) {
  const parts = [
    params.contextNote,
    `Player: ${params.playerName}`,
    `Age: ${params.playerAge}`,
    params.playerBirthdate ? `Birthday: ${params.playerBirthdate}` : null,
    params.teamLevel ? `Team: ${params.teamLevel}` : null,
    params.dominantFoot ? `Preferred foot: ${params.dominantFoot}` : null,
    params.developmentNotes ? `Notes: ${params.developmentNotes}` : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

function generatePortalPassword(length = 10) {
  const bytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += PORTAL_PASSWORD_CHARSET[bytes[i] % PORTAL_PASSWORD_CHARSET.length];
  }
  return password;
}

function mapGroupSessionRow(row: GroupSessionRaw): GroupSessionWithAvailability {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    image_url: row.image_url,
    session_date: row.session_date,
    session_date_end: row.session_date_end,
    location: row.location,
    price: row.price === null ? null : Number(row.price),
    curriculum: row.curriculum,
    max_players: Number(row.max_players),
    paid_signups: Number(row.paid_signups),
    spots_left: Number(row.spots_left),
  };
}

export async function getUpcomingGroupSessions(
  limit = 50
): Promise<GroupSessionWithAvailability[]> {
  const boundedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  const rows = (await sql`
    SELECT
      gs.id::int AS id,
      gs.title,
      gs.description,
      gs.image_url,
      gs.session_date::text AS session_date,
      gs.session_date_end::text AS session_date_end,
      gs.location,
      gs.price::float8 AS price,
      gs.curriculum,
      gs.max_players::int AS max_players,
      COALESCE(ps.paid_signups, 0)::int AS paid_signups,
      GREATEST(gs.max_players - COALESCE(ps.paid_signups, 0), 0)::int AS spots_left
    FROM group_sessions gs
    LEFT JOIN (
      SELECT group_session_id, COUNT(*)::int AS paid_signups
      FROM player_signups
      WHERE has_paid = true
      GROUP BY group_session_id
    ) ps ON ps.group_session_id = gs.id
    WHERE gs.session_date >= NOW()
    ORDER BY gs.session_date ASC
    LIMIT ${boundedLimit}
  `) as unknown as GroupSessionRaw[];

  return rows.map(mapGroupSessionRow);
}

export async function getGroupSessionById(
  id: number
): Promise<GroupSessionWithAvailability | null> {
  const rows = (await sql`
    SELECT
      gs.id::int AS id,
      gs.title,
      gs.description,
      gs.image_url,
      gs.session_date::text AS session_date,
      gs.session_date_end::text AS session_date_end,
      gs.location,
      gs.price::float8 AS price,
      gs.curriculum,
      gs.max_players::int AS max_players,
      COALESCE(ps.paid_signups, 0)::int AS paid_signups,
      GREATEST(gs.max_players - COALESCE(ps.paid_signups, 0), 0)::int AS spots_left
    FROM group_sessions gs
    LEFT JOIN (
      SELECT group_session_id, COUNT(*)::int AS paid_signups
      FROM player_signups
      WHERE has_paid = true
      GROUP BY group_session_id
    ) ps ON ps.group_session_id = gs.id
    WHERE gs.id = ${id}
    LIMIT 1
  `) as unknown as GroupSessionRaw[];

  return rows[0] ? mapGroupSessionRow(rows[0]) : null;
}

export async function provisionParentAndPlayerForGroupSignup(data: {
  existingParentId?: string | null;
  portalPassword?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  parentName?: string | null;
  firstName: string;
  lastName: string;
  playerAge: number;
  playerBirthdate?: string | null;
  foot?: string | null;
  team?: string | null;
  notes?: string | null;
  crmContextNote?: string | null;
}): Promise<GroupSignupProvisionResult> {
  const normalizedEmail = data.contactEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("A contact email is required to create a parent account.");
  }

  const playerName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
  if (!playerName) {
    throw new Error("Player name is required to create a player profile.");
  }

  const parentName = cleanNullableText(data.parentName);
  const parentPhone = normalizePhoneForStorage(data.contactPhone);
  const dominantFoot = cleanNullableText(data.foot);
  const teamLevel = cleanNullableText(data.team);
  const developmentNotes = cleanNullableText(data.notes);
  const playerBirthdate = cleanNullableText(data.playerBirthdate);
  const crmContextNote =
    cleanNullableText(data.crmContextNote) || "Session booked via group checkout";

  const parentCrmNoteEntry = [
    crmContextNote,
    `Parent: ${parentName || "N/A"}`,
    `Email: ${normalizedEmail}`,
    parentPhone ? `Phone: ${parentPhone}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const playerCrmNoteEntry = buildPlayerCrmNoteEntry({
    contextNote: crmContextNote,
    playerName,
    playerBirthdate,
    playerAge: data.playerAge,
    teamLevel,
    dominantFoot,
    developmentNotes,
  });

  const existingParents = (data.existingParentId
    ? await sql`
      SELECT id, email, phone, name, crm_parent_id
      FROM parents
      WHERE id = ${data.existingParentId}
      LIMIT 1
    `
    : await sql`
      SELECT id, email, phone, name, crm_parent_id
      FROM parents
      WHERE lower(email) = lower(${normalizedEmail})
      LIMIT 1
    `) as unknown as Array<{
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    crm_parent_id: number | null;
  }>;

  let parentId = "";
  let parentWasCreated = false;
  let generatedPassword: string | null = null;
  let crmParentId: number | null = existingParents[0]?.crm_parent_id || null;

  if (existingParents[0]) {
    parentId = existingParents[0].id;

    if (parentName && !cleanNullableText(existingParents[0].name)) {
      await sql`
        UPDATE parents
        SET name = ${parentName},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${parentId}
      `;
    }

    if (parentPhone && !cleanNullableText(existingParents[0].phone)) {
      const phoneConflict = (await sql`
        SELECT id
        FROM parents
        WHERE phone = ${parentPhone}
          AND id <> ${parentId}
        LIMIT 1
      `) as unknown as Array<{ id: string }>;

      if (!phoneConflict[0]) {
        await sql`
          UPDATE parents
          SET phone = ${parentPhone},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${parentId}
        `;
      }
    }

    if (normalizedEmail && !cleanNullableText(existingParents[0].email)) {
      const emailConflict = (await sql`
        SELECT id
        FROM parents
        WHERE lower(email) = lower(${normalizedEmail})
          AND id <> ${parentId}
        LIMIT 1
      `) as unknown as Array<{ id: string }>;

      if (!emailConflict[0]) {
        await sql`
          UPDATE parents
          SET email = ${normalizedEmail},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${parentId}
        `;
      }
    }
  } else {
    const passwordToStore = cleanNullableText(data.portalPassword) || generatePortalPassword(10);
    generatedPassword = cleanNullableText(data.portalPassword) ? null : passwordToStore;
    const passwordHash = await bcrypt.hash(passwordToStore, 10);

    let phoneForInsert = parentPhone;
    if (phoneForInsert) {
      const phoneConflict = (await sql`
        SELECT id
        FROM parents
        WHERE phone = ${phoneForInsert}
        LIMIT 1
      `) as unknown as Array<{ id: string }>;

      if (phoneConflict[0]) {
        phoneForInsert = null;
      }
    }

    const insertedParents = (await sql`
      INSERT INTO parents (email, phone, name, password_hash)
      VALUES (${normalizedEmail}, ${phoneForInsert}, ${parentName}, ${passwordHash})
      RETURNING id
    `) as unknown as Array<{ id: string }>;

    if (!insertedParents[0]) {
      throw new Error("Unable to create parent account.");
    }

    parentId = insertedParents[0].id;
    parentWasCreated = true;
  }

  if (!crmParentId) {
    const crmByEmail = (await sql`
      SELECT id
      FROM crm_parents
      WHERE lower(email) = lower(${normalizedEmail})
      ORDER BY id ASC
      LIMIT 1
    `) as unknown as Array<{ id: number }>;

    if (crmByEmail[0]) {
      crmParentId = crmByEmail[0].id;
    } else if (parentPhone) {
      const crmByPhone = (await sql`
        SELECT id
        FROM crm_parents
        WHERE phone = ${parentPhone}
        ORDER BY id ASC
        LIMIT 1
      `) as unknown as Array<{ id: number }>;

      if (crmByPhone[0]) {
        crmParentId = crmByPhone[0].id;
      }
    }
  }

  if (!crmParentId) {
    const insertedCrmParents = (await sql`
      INSERT INTO crm_parents (name, email, phone, notes, last_activity_at, is_dead)
      VALUES (${parentName || `${playerName} Parent`}, ${normalizedEmail}, ${parentPhone}, ${parentCrmNoteEntry}, CURRENT_TIMESTAMP, false)
      RETURNING id
    `) as unknown as Array<{ id: number }>;

    crmParentId = insertedCrmParents[0]?.id || null;
  }

  if (!crmParentId) {
    throw new Error("Unable to create or locate CRM parent record.");
  }

  const crmParentRows = (await sql`
    SELECT notes
    FROM crm_parents
    WHERE id = ${crmParentId}
    LIMIT 1
  `) as unknown as Array<{ notes: string | null }>;

  const mergedCrmParentNotes = appendCrmNote(
    crmParentRows[0]?.notes || null,
    parentCrmNoteEntry
  );

  await sql`
    UPDATE crm_parents
    SET name = CASE
          WHEN NULLIF(name, '') IS NULL AND NULLIF(${parentName}, '') IS NOT NULL
            THEN ${parentName}
          ELSE name
        END,
        email = CASE
          WHEN NULLIF(email, '') IS NULL AND NULLIF(${normalizedEmail}, '') IS NOT NULL
            THEN ${normalizedEmail}
          ELSE email
        END,
        phone = CASE
          WHEN NULLIF(phone, '') IS NULL AND NULLIF(${parentPhone}, '') IS NOT NULL
            THEN ${parentPhone}
          ELSE phone
        END,
        notes = ${mergedCrmParentNotes},
        is_dead = false,
        last_activity_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${crmParentId}
  `;

  await sql`
    UPDATE parents
    SET crm_parent_id = ${crmParentId},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${parentId}
      AND crm_parent_id IS NULL
  `;

  const existingPlayers = (await sql`
    SELECT id, crm_player_id
    FROM players
    WHERE parent_id = ${parentId}
      AND lower(name) = lower(${playerName})
    LIMIT 1
  `) as unknown as Array<{
    id: string;
    crm_player_id: number | null;
  }>;

  let playerId = "";
  let crmPlayerId: number | null = existingPlayers[0]?.crm_player_id || null;

  if (existingPlayers[0]) {
    playerId = existingPlayers[0].id;

    await sql`
      UPDATE players
      SET age = ${data.playerAge},
          birthdate = COALESCE(birthdate, ${playerBirthdate}::date),
          dominant_foot = CASE
            WHEN NULLIF(dominant_foot, '') IS NULL AND NULLIF(${dominantFoot}, '') IS NOT NULL
              THEN ${dominantFoot}
            ELSE dominant_foot
          END,
          team_level = CASE
            WHEN NULLIF(team_level, '') IS NULL AND NULLIF(${teamLevel}, '') IS NOT NULL
              THEN ${teamLevel}
            ELSE team_level
          END,
          long_term_development_notes = CASE
            WHEN NULLIF(long_term_development_notes, '') IS NULL AND NULLIF(${developmentNotes}, '') IS NOT NULL
              THEN ${developmentNotes}
            ELSE long_term_development_notes
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${playerId}
    `;
  } else {
    const insertedPlayers = (await sql`
      INSERT INTO players (
        parent_id,
        name,
        age,
        birthdate,
        dominant_foot,
        team_level,
        long_term_development_notes
      )
      VALUES (
        ${parentId},
        ${playerName},
        ${data.playerAge},
        ${playerBirthdate}::date,
        ${dominantFoot},
        ${teamLevel},
        ${developmentNotes}
      )
      RETURNING id
    `) as unknown as Array<{ id: string }>;

    if (!insertedPlayers[0]) {
      throw new Error("Unable to create player profile.");
    }

    playerId = insertedPlayers[0].id;
  }

  if (!crmPlayerId) {
    const existingCrmPlayers = (await sql`
      SELECT id
      FROM crm_players
      WHERE parent_id = ${crmParentId}
        AND lower(name) = lower(${playerName})
      ORDER BY id ASC
      LIMIT 1
    `) as unknown as Array<{ id: number }>;

    if (existingCrmPlayers[0]) {
      crmPlayerId = existingCrmPlayers[0].id;
    }
  }

  if (!crmPlayerId) {
    const insertedCrmPlayers = (await sql`
      INSERT INTO crm_players (parent_id, name, age, team, notes)
      VALUES (${crmParentId}, ${playerName}, ${data.playerAge}, ${teamLevel}, ${playerCrmNoteEntry})
      RETURNING id
    `) as unknown as Array<{ id: number }>;

    crmPlayerId = insertedCrmPlayers[0]?.id || null;
  }

  if (!crmPlayerId) {
    throw new Error("Unable to create or locate CRM player record.");
  }

  const crmPlayerRows = (await sql`
    SELECT notes
    FROM crm_players
    WHERE id = ${crmPlayerId}
    LIMIT 1
  `) as unknown as Array<{ notes: string | null }>;

  const mergedCrmPlayerNotes = appendCrmNote(
    crmPlayerRows[0]?.notes || null,
    playerCrmNoteEntry
  );

  await sql`
    UPDATE crm_players
    SET age = ${data.playerAge},
        team = COALESCE(NULLIF(${teamLevel}, ''), team),
        notes = ${mergedCrmPlayerNotes},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${crmPlayerId}
  `;

  await sql`
    UPDATE players
    SET crm_player_id = ${crmPlayerId},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${playerId}
      AND crm_player_id IS NULL
  `;

  const parentEmailRows = (await sql`
    SELECT email
    FROM parents
    WHERE id = ${parentId}
    LIMIT 1
  `) as unknown as Array<{ email: string | null }>;

  const parentEmail =
    cleanNullableText(parentEmailRows[0]?.email)?.toLowerCase() || normalizedEmail;

  return {
    parentId,
    playerId,
    parentEmail,
    parentWasCreated,
    generatedPassword,
  };
}

export async function createPlayerSignup(data: {
  group_session_id: number;
  first_name: string;
  last_name: string;
  emergency_contact: string;
  contact_email: string;
  contact_phone?: string | null;
  birthday?: string | null;
  foot?: string | null;
  team?: string | null;
  notes?: string | null;
  signup_price?: number | null;
}): Promise<{ id: number }> {
  const rows = (await sql`
    INSERT INTO player_signups (
      group_session_id,
      first_name,
      last_name,
      emergency_contact,
      contact_phone,
      contact_email,
      birthday,
      foot,
      team,
      notes,
      signup_price,
      has_paid
    )
    VALUES (
      ${data.group_session_id},
      ${data.first_name},
      ${data.last_name},
      ${data.emergency_contact},
      ${normalizePhoneForStorage(data.contact_phone)},
      ${data.contact_email},
      ${data.birthday}::date,
      ${cleanNullableText(data.foot)},
      ${cleanNullableText(data.team)},
      ${cleanNullableText(data.notes)},
      ${data.signup_price ?? null},
      false
    )
    RETURNING id::int AS id
  `) as unknown as Array<{ id: number }>;

  if (!rows[0]) {
    throw new Error("Unable to create player signup.");
  }

  return { id: rows[0].id };
}

export async function updatePlayerSignupsCheckout(
  signupIds: number[],
  checkoutSessionId: string,
  paymentIntentId?: string | null
): Promise<void> {
  if (signupIds.length === 0) return;
  for (const signupId of signupIds) {
    await sql`
      UPDATE player_signups
      SET stripe_checkout_session_id = ${checkoutSessionId},
          stripe_payment_intent_id = COALESCE(${paymentIntentId || null}, stripe_payment_intent_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${signupId}
    `;
  }
}

export async function markPlayerSignupsPaidByCheckoutSession(
  checkoutSessionId: string,
  updates: {
    paymentIntentId?: string | null;
    chargeId?: string | null;
    receiptUrl?: string | null;
  }
): Promise<PaidPlayerSignup[]> {
  const rows = (await sql`
    UPDATE player_signups
    SET has_paid = true,
        amount_paid = COALESCE(amount_paid, signup_price),
        stripe_payment_intent_id = COALESCE(${updates.paymentIntentId || null}, stripe_payment_intent_id),
        stripe_charge_id = COALESCE(${updates.chargeId || null}, stripe_charge_id),
        stripe_receipt_url = COALESCE(${updates.receiptUrl || null}, stripe_receipt_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE stripe_checkout_session_id = ${checkoutSessionId}
      AND has_paid = false
    RETURNING
      id::int AS id,
      group_session_id::int AS group_session_id,
      first_name,
      last_name,
      emergency_contact,
      contact_phone,
      contact_email
  `) as unknown as PaidPlayerSignup[];

  return rows;
}
