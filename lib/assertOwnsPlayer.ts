import "server-only";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";

export async function assertOwnsPlayer(req: NextRequest, playerId: string) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token?.sub)
    return { ok: false as const, res: new Response("Unauthorized", { status: 401 }) };

  // Admins can access any player
  if (token.isAdmin === true)
    return { ok: true as const, parentId: token.sub };

  const rows = (await sql`
    SELECT 1 FROM players WHERE id = ${playerId} AND parent_id = ${token.sub} LIMIT 1
  `) as unknown as unknown[];

  if (rows.length === 0)
    return { ok: false as const, res: new Response("Not found", { status: 404 }) };

  return { ok: true as const, parentId: token.sub };
}
