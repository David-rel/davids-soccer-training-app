import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

type ParentRow = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(req: NextRequest) {
  const err = assertAdmin(req);
  if (err) return err;

  const parents = (await sql`
    SELECT id, email, phone, created_at, updated_at
    FROM parents
    ORDER BY created_at DESC
  `) as unknown as ParentRow[];

  return Response.json({ parents });
}

export async function POST(req: NextRequest) {
  const err = assertAdmin(req);
  if (err) return err;

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    phone?: string;
    password?: string;
  } | null;

  const email =
    String(body?.email ?? "")
      .trim()
      .toLowerCase() || null;
  const phone = String(body?.phone ?? "").trim() || null;
  const password = String(body?.password ?? "");

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
    INSERT INTO parents (email, phone, password_hash)
    VALUES (${email}, ${phone}, ${passwordHash})
    RETURNING id, email, phone, created_at, updated_at
  `) as unknown as ParentRow[];

  return Response.json({ parent: rows[0] }, { status: 201 });
}
