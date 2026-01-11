import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { authOptions } from "@/lib/auth";
import { sql } from "@/db";

type ParentRow = {
  id: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const parentId = session?.user?.id;
  if (!parentId) return json({ error: "Unauthorized" }, 401);

  const rows = (await sql`
    SELECT id, email, phone, password_hash
    FROM parents
    WHERE id = ${parentId}
    LIMIT 1
  `) as unknown as ParentRow[];

  const parent = rows[0];
  if (!parent) return json({ error: "Parent not found" }, 404);

  return json({ email: parent.email, phone: parent.phone });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const parentId = session?.user?.id;
  if (!parentId) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as {
    email?: string | null;
    phone?: string | null;
  } | null;
  if (!body) return json({ error: "Invalid JSON body" }, 400);

  const rows = (await sql`
    SELECT id, email, phone, password_hash
    FROM parents
    WHERE id = ${parentId}
    LIMIT 1
  `) as unknown as ParentRow[];
  const parent = rows[0];
  if (!parent) return json({ error: "Parent not found" }, 404);

  const nextEmail =
    body.email === undefined ? parent.email : body.email ?? null;
  const nextPhone =
    body.phone === undefined ? parent.phone : body.phone ?? null;

  const cleanedEmail =
    nextEmail === null ? null : String(nextEmail).trim() || null;
  const cleanedPhone =
    nextPhone === null ? null : String(nextPhone).trim() || null;

  if (!cleanedEmail && !cleanedPhone) {
    return json({ error: "Email or phone is required." }, 400);
  }

  if (
    cleanedEmail &&
    (parent.email === null ||
      cleanedEmail.toLowerCase() !== parent.email.toLowerCase())
  ) {
    const existing = (await sql`
      SELECT id
      FROM parents
      WHERE lower(email) = lower(${cleanedEmail}) AND id <> ${parentId}
      LIMIT 1
    `) as unknown as { id: string }[];
    if (existing[0]) {
      return json({ error: "That email is already in use." }, 409);
    }
  }

  if (cleanedPhone && cleanedPhone !== parent.phone) {
    const existing = (await sql`
      SELECT id
      FROM parents
      WHERE phone = ${cleanedPhone} AND id <> ${parentId}
      LIMIT 1
    `) as unknown as { id: string }[];
    if (existing[0]) {
      return json({ error: "That phone number is already in use." }, 409);
    }
  }

  const updated = (await sql`
    UPDATE parents
    SET email = ${cleanedEmail}, phone = ${cleanedPhone}
    WHERE id = ${parentId}
    RETURNING email, phone
  `) as unknown as { email: string | null; phone: string | null }[];

  return json({
    email: updated[0]?.email ?? null,
    phone: updated[0]?.phone ?? null,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const parentId = session?.user?.id;
  if (!parentId) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as {
    oldPassword?: string;
    newPassword?: string;
  } | null;
  if (!body) return json({ error: "Invalid JSON body" }, 400);

  const oldPassword = String(body.oldPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!oldPassword) return json({ error: "Old password is required." }, 400);
  if (!newPassword) return json({ error: "New password is required." }, 400);
  if (newPassword.length < 8) {
    return json({ error: "New password must be at least 8 characters." }, 400);
  }

  const rows = (await sql`
    SELECT id, email, phone, password_hash
    FROM parents
    WHERE id = ${parentId}
    LIMIT 1
  `) as unknown as ParentRow[];
  const parent = rows[0];
  if (!parent) return json({ error: "Parent not found" }, 404);

  const ok = await bcrypt.compare(oldPassword, parent.password_hash);
  if (!ok) return json({ error: "Old password is incorrect." }, 401);

  const nextHash = await bcrypt.hash(newPassword, 10);
  await sql`UPDATE parents SET password_hash = ${nextHash} WHERE id = ${parentId}`;

  return json({ ok: true });
}
