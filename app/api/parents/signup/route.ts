import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { sql } from "@/db";
import { sendNewParentSignupEmail } from "@/lib/email";
import { normalizePhoneForStorage } from "@/lib/phone";

type SignupBody = {
  email?: string;
  phone?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as SignupBody | null;

  const email = String(body?.email ?? "").trim().toLowerCase();
  const phone = normalizePhoneForStorage(body?.phone ?? "");
  const password = String(body?.password ?? "");

  if (!email || !phone || !password) {
    return Response.json(
      { error: "Email, phone number, and password are required." },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  if (password.length < 6) {
    return Response.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const emailConflict = (await sql`
    SELECT id
    FROM parents
    WHERE lower(email) = lower(${email})
    LIMIT 1
  `) as unknown as Array<{ id: string }>;
  if (emailConflict[0]) {
    return Response.json(
      { error: "That email is already in use." },
      { status: 409 }
    );
  }

  const phoneConflict = (await sql`
    SELECT id
    FROM parents
    WHERE phone = ${phone}
    LIMIT 1
  `) as unknown as Array<{ id: string }>;
  if (phoneConflict[0]) {
    return Response.json(
      { error: "That phone number is already in use." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const created = (await sql`
    INSERT INTO parents (email, phone, password_hash)
    VALUES (${email}, ${phone}, ${passwordHash})
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  const createdAtLabel = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Phoenix",
  });

  void sendNewParentSignupEmail({
    email,
    phone,
    createdAt: createdAtLabel,
  });

  return Response.json({ parentId: created[0]?.id ?? null }, { status: 201 });
}
