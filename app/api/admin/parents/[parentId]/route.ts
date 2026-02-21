import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";
import { normalizePhoneForLookup, normalizePhoneForStorage } from "@/lib/phone";

type ParentRow = {
  id: string;
  name: string | null;
  secondary_parent_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ parentId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { parentId } = await ctx.params;

  const rows = (await sql`
    SELECT id, name, secondary_parent_name, email, phone, created_at, updated_at
    FROM parents
    WHERE id = ${parentId}
    LIMIT 1
  `) as unknown as ParentRow[];

  const parent = rows[0];
  if (!parent) return new Response("Parent not found", { status: 404 });

  return Response.json({ parent });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ parentId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { parentId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | {
        name?: string | null;
        secondary_parent_name?: string | null;
        email?: string | null;
        phone?: string | null;
      }
    | null;

  if (!body) return new Response("Invalid JSON body.", { status: 400 });

  const rows = (await sql`
    SELECT id, name, secondary_parent_name, email, phone, created_at, updated_at
    FROM parents
    WHERE id = ${parentId}
    LIMIT 1
  `) as unknown as ParentRow[];

  const existingParent = rows[0];
  if (!existingParent) return new Response("Parent not found", { status: 404 });

  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

  const nextName = has("name")
    ? String(body.name ?? "").trim() || null
    : existingParent.name;
  const nextSecondaryParentName = has("secondary_parent_name")
    ? String(body.secondary_parent_name ?? "").trim() || null
    : existingParent.secondary_parent_name;
  const nextEmail = has("email")
    ? String(body.email ?? "")
        .trim()
        .toLowerCase() || null
    : existingParent.email;
  const nextPhone = has("phone")
    ? normalizePhoneForStorage(body.phone)
    : existingParent.phone;

  if (!nextEmail && !nextPhone) {
    return new Response("Email or phone is required.", { status: 400 });
  }

  const currentEmail = existingParent.email?.toLowerCase() ?? null;
  if (nextEmail && nextEmail !== currentEmail) {
    const emailConflict = (await sql`
      SELECT id
      FROM parents
      WHERE lower(email) = lower(${nextEmail})
        AND id <> ${parentId}
      LIMIT 1
    `) as unknown as Array<{ id: string }>;
    if (emailConflict[0]) {
      return new Response("That email is already in use.", { status: 409 });
    }
  }

  const currentPhoneLookup = normalizePhoneForLookup(existingParent.phone);
  const nextPhoneLookup = normalizePhoneForLookup(nextPhone);
  if (nextPhoneLookup && nextPhoneLookup !== currentPhoneLookup) {
    const phoneConflict = (await sql`
      SELECT id
      FROM parents
      WHERE regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = ${nextPhoneLookup}
        AND id <> ${parentId}
      LIMIT 1
    `) as unknown as Array<{ id: string }>;
    if (phoneConflict[0]) {
      return new Response("That phone number is already in use.", { status: 409 });
    }
  }

  const updated = (await sql`
    UPDATE parents
    SET
      name = ${nextName},
      secondary_parent_name = ${nextSecondaryParentName},
      email = ${nextEmail},
      phone = ${nextPhone}
    WHERE id = ${parentId}
    RETURNING id, name, secondary_parent_name, email, phone, created_at, updated_at
  `) as unknown as ParentRow[];

  return Response.json({ parent: updated[0] });
}
