import "server-only";

import { NextRequest } from "next/server";

export function assertAdmin(req: NextRequest) {
  const expected = process.env.SECURITY_CODE;
  if (!expected) {
    return new Response("SECURITY_CODE is not set.", { status: 500 });
  }

  const provided = req.headers.get("x-security-code") ?? "";
  if (provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
