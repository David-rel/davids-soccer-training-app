import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";
import { normalizePhoneForStorage } from "@/lib/phone";

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
    password?: string;
    crm_parent_id?: number | string | null;
  } | null;

  const crmParentId = parseOptionalPositiveInt(body?.crm_parent_id);
  if (crmParentId === "invalid") {
    return new Response("crm_parent_id must be a positive integer.", {
      status: 400,
    });
  }

  const password = String(body?.password ?? "");

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

  if (!email && !phone) {
    return new Response("Email or phone is required.", { status: 400 });
  }
  if (!password || password.length < 6) {
    return new Response("Password must be at least 6 characters.", {
      status: 400,
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const rows = (await sql`
    INSERT INTO parents (
      name,
      secondary_parent_name,
      email,
      phone,
      password_hash,
      crm_parent_id
    )
    VALUES (
      ${name},
      ${secondaryParentName},
      ${email},
      ${phone},
      ${passwordHash},
      ${crmParentId}
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

  return Response.json({ parent: rows[0] }, { status: 201 });
}
