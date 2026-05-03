import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest } from "next/server";

import { sql } from "@/db";
import { sendPasswordResetCodeEmail } from "@/lib/email";

const RESET_CODE_TTL_MINUTES = 15;

type ParentRow = {
  id: string;
  email: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isValidEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return json({ error: "Please enter a valid email." }, 400);
  }

  const parents = (await sql`
    SELECT id, email
    FROM parents
    WHERE lower(email) = lower(${email})
    ORDER BY created_at ASC
    LIMIT 1
  `) as unknown as ParentRow[];

  const parent = parents[0];
  if (!parent) {
    return json({ error: "No parent account was found with that email." }, 404);
  }

  await sql`
    UPDATE parent_password_reset_codes
    SET used_at = CURRENT_TIMESTAMP
    WHERE parent_id = ${parent.id}
      AND used_at IS NULL
  `;

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  await sql`
    INSERT INTO parent_password_reset_codes (
      parent_id,
      email,
      code_hash,
      expires_at
    )
    VALUES (
      ${parent.id},
      ${parent.email.toLowerCase()},
      ${codeHash},
      CURRENT_TIMESTAMP + (${RESET_CODE_TTL_MINUTES} || ' minutes')::interval
    )
  `;

  const sent = await sendPasswordResetCodeEmail({
    to: parent.email,
    code,
    expiresInMinutes: RESET_CODE_TTL_MINUTES,
  });

  if (!sent.success) {
    return json({ error: "Could not send reset code. Try again later." }, 500);
  }

  return json({ ok: true });
}
