import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { sql } from "@/db";

type ResetCodeRow = {
  id: string;
  parent_id: string;
  code_hash: string;
  attempt_count: number;
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

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        email?: string;
        code?: string;
        password?: string;
      }
    | null;

  const email = String(body?.email ?? "").trim().toLowerCase();
  const code = String(body?.code ?? "").replace(/\D/g, "");
  const password = String(body?.password ?? "");

  if (!email || !isValidEmail(email)) {
    return json({ error: "Please enter a valid email." }, 400);
  }
  if (!/^\d{6}$/.test(code)) {
    return json({ error: "Enter the 6-digit reset code." }, 400);
  }
  if (password.length < 6) {
    return json({ error: "Password must be at least 6 characters." }, 400);
  }

  const resetRows = (await sql`
    SELECT id, parent_id, code_hash, attempt_count
    FROM parent_password_reset_codes
    WHERE lower(email) = lower(${email})
      AND used_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC
    LIMIT 1
  `) as unknown as ResetCodeRow[];

  const reset = resetRows[0];
  if (!reset) {
    return json({ error: "Reset code was not found or has expired." }, 400);
  }

  if (reset.attempt_count >= 5) {
    await sql`
      UPDATE parent_password_reset_codes
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = ${reset.id}
    `;
    return json({ error: "Too many incorrect attempts. Request a new code." }, 429);
  }

  const codeMatches = await bcrypt.compare(code, reset.code_hash);
  if (!codeMatches) {
    await sql`
      UPDATE parent_password_reset_codes
      SET attempt_count = attempt_count + 1
      WHERE id = ${reset.id}
    `;
    return json({ error: "Incorrect reset code." }, 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await sql`
    UPDATE parents
    SET password_hash = ${passwordHash},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${reset.parent_id}
  `;

  await sql`
    UPDATE parent_password_reset_codes
    SET used_at = CURRENT_TIMESTAMP
    WHERE parent_id = ${reset.parent_id}
      AND used_at IS NULL
  `;

  return json({ ok: true });
}
