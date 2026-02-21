import "server-only";

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";

function hasValidSecurityCode(req: NextRequest) {
  const expected = process.env.SECURITY_CODE;
  if (!expected) return false;
  const provided = req.headers.get("x-security-code") ?? "";
  return provided === expected;
}

export async function assertAdmin(req: NextRequest) {
  const token = await getToken({ req });
  if (token?.sub && token.isAdmin === true) {
    return null;
  }

  if (hasValidSecurityCode(req)) {
    return null;
  }

  if (token?.sub) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response("Unauthorized", { status: 401 });
}

export async function getAdminActorId(req: NextRequest) {
  const token = await getToken({ req });
  if (token?.sub && token.isAdmin === true) return token.sub;

  if (!hasValidSecurityCode(req)) return null;

  if (token?.sub) return token.sub;

  const rows = (await sql`
    SELECT id
    FROM parents
    WHERE is_admin = true
    ORDER BY created_at ASC
    LIMIT 1
  `) as unknown as Array<{ id: string }>;

  return rows[0]?.id ?? null;
}

export function isSecurityCodeConfigured() {
  return Boolean(process.env.SECURITY_CODE);
}

export function assertSecurityCode(req: NextRequest) {
  if (!isSecurityCodeConfigured()) {
    return new Response("SECURITY_CODE is not configured.", { status: 500 });
  }
  if (!hasValidSecurityCode(req)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
}
