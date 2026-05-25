import { NextRequest } from "next/server";
import crypto from "crypto";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";
import { normalizePhoneForLookup, normalizePhoneForStorage } from "@/lib/phone";
import { sendSmsViaTwilio } from "@/lib/twilio";

type ParentRow = {
  id: string;
  name: string | null;
  secondary_parent_name: string | null;
  email: string | null;
  phone: string | null;
  crm_parent_id: number | null;
  created_at: string;
  updated_at: string;
};

type CrmParentRow = {
  id: number;
  name: string;
  secondary_parent_name: string | null;
  email: string | null;
  phone: string | null;
};

function parseOptionalPositiveInt(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return "invalid";
  return parsed;
}

export async function GET(req: NextRequest) {
  const err = await assertAdmin(req);
  if (err) return err;

  const parents = (await sql`
    SELECT
      id,
      name,
      secondary_parent_name,
      email,
      phone,
      crm_parent_id,
      created_at,
      updated_at
    FROM parents
    ORDER BY created_at DESC
  `) as unknown as ParentRow[];

  return Response.json({ parents });
}

export async function POST(req: NextRequest) {
  const err = await assertAdmin(req);
  if (err) return err;

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    secondary_parent_name?: string;
    email?: string;
    phone?: string;
    crm_parent_id?: number | string | null;
    send_sms?: boolean;
  } | null;

  const crmParentId = parseOptionalPositiveInt(body?.crm_parent_id);
  if (crmParentId === "invalid") {
    return new Response("crm_parent_id must be a positive integer.", {
      status: 400,
    });
  }

  let crmParent: CrmParentRow | null = null;
  if (crmParentId !== null) {
    const existingLink = (await sql`
      SELECT id
      FROM parents
      WHERE crm_parent_id = ${crmParentId}
      LIMIT 1
    `) as unknown as Array<{ id: string }>;
    if (existingLink[0]) {
      return new Response("That CRM parent is already linked in the app.", {
        status: 409,
      });
    }

    const crmRows = (await sql`
      SELECT id, name, secondary_parent_name, email, phone
      FROM crm_parents
      WHERE id = ${crmParentId}
      LIMIT 1
    `) as unknown as CrmParentRow[];
    crmParent = crmRows[0] ?? null;
    if (!crmParent) {
      return new Response("CRM parent not found.", { status: 404 });
    }
  }

  const providedName = String(body?.name ?? "").trim();
  const name = providedName || String(crmParent?.name ?? "").trim() || null;

  const providedSecondaryParentName = String(
    body?.secondary_parent_name ?? ""
  ).trim();
  const secondaryParentName =
    providedSecondaryParentName ||
    String(crmParent?.secondary_parent_name ?? "").trim() ||
    null;

  const providedEmail = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const email =
    providedEmail ||
    String(crmParent?.email ?? "")
      .trim()
      .toLowerCase() ||
    null;

  const providedPhoneRaw = String(body?.phone ?? "").trim();
  const phone = normalizePhoneForStorage(
    providedPhoneRaw || crmParent?.phone || ""
  );
  const phoneLookup = normalizePhoneForLookup(phone);

  if (!email && !phone) {
    return new Response("Email or phone is required.", { status: 400 });
  }
  if (!phone) {
    return new Response(
      "A phone number is required to send the setup link via SMS.",
      { status: 400 }
    );
  }

  if (email) {
    const emailConflict = (await sql`
      SELECT id
      FROM parents
      WHERE lower(email) = lower(${email})
      ORDER BY created_at ASC
      LIMIT 1
    `) as unknown as Array<{ id: string }>;
    if (emailConflict[0]) {
      return new Response("That email is already in use.", { status: 409 });
    }
  }

  if (phoneLookup) {
    const phoneConflict = (await sql`
      SELECT id
      FROM parents
      WHERE regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = ${phoneLookup}
         OR right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) = ${phoneLookup}
      ORDER BY created_at ASC
      LIMIT 1
    `) as unknown as Array<{ id: string }>;
    if (phoneConflict[0]) {
      return new Response("That phone number is already in use.", { status: 409 });
    }
  }

  const signupToken = crypto.randomUUID();
  const signupTokenExpiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const rows = (await sql`
    INSERT INTO parents (
      name,
      secondary_parent_name,
      email,
      phone,
      crm_parent_id,
      signup_token,
      signup_token_expires_at
    )
    VALUES (
      ${name},
      ${secondaryParentName},
      ${email},
      ${phone},
      ${crmParentId},
      ${signupToken}::uuid,
      ${signupTokenExpiresAt}::timestamptz
    )
    RETURNING
      id,
      name,
      secondary_parent_name,
      email,
      phone,
      crm_parent_id,
      created_at,
      updated_at
  `) as unknown as ParentRow[];

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  const setupUrl = `${baseUrl}/setup/${signupToken}`;
  const smsBody =
    `Coach David has made your training account, click below to view and set it up ` +
    `(if you did not want this please ignore): ${setupUrl}`;

  let smsSent = false;
  let smsError: string | null = null;
  if (body?.send_sms !== false) {
    try {
      await sendSmsViaTwilio(smsBody, { to: phone });
      smsSent = true;
    } catch (e) {
      smsError = e instanceof Error ? e.message : "SMS failed";
    }
  }

  return Response.json(
    { parent: rows[0], smsSent, smsError },
    { status: 201 }
  );
}
