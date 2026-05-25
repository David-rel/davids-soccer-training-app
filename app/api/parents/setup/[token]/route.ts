import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { sql } from "@/db";

type ParentRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  signup_token_expires_at: string;
};

type PlayerRow = {
  id: string;
  name: string;
  age: number | null;
  birthdate: string | null;
  team_level: string | null;
};

async function resolveToken(token: string): Promise<ParentRow | null> {
  const rows = (await sql`
    SELECT id, name, email, phone, signup_token_expires_at
    FROM parents
    WHERE signup_token = ${token}::uuid
    LIMIT 1
  `) as unknown as ParentRow[];

  const parent = rows[0];
  if (!parent) return null;

  if (new Date(parent.signup_token_expires_at) < new Date()) return null;

  return parent;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const parent = await resolveToken(token).catch(() => null);
  if (!parent) {
    return new Response("Setup link is invalid or has expired.", { status: 404 });
  }

  const players = (await sql`
    SELECT id, name, age, birthdate::text AS birthdate, team_level
    FROM players
    WHERE parent_id = ${parent.id}
    ORDER BY created_at ASC
  `) as unknown as PlayerRow[];

  return Response.json({
    parent: {
      id: parent.id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
    },
    players,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const parent = await resolveToken(token).catch(() => null);
  if (!parent) {
    return new Response("Setup link is invalid or has expired.", { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    password?: string;
  } | null;

  const password = String(body?.password ?? "");
  if (!password || password.length < 6) {
    return Response.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await sql`
    UPDATE parents
    SET password_hash = ${passwordHash},
        signup_token = NULL,
        signup_token_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${parent.id}
  `;

  return Response.json({
    ok: true,
    identifier: parent.email ?? parent.phone,
  });
}
