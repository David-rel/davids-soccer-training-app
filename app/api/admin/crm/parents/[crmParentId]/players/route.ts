import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

type CrmPlayerRow = {
  id: number;
  parent_id: number;
  name: string;
  age: number | null;
  team: string | null;
  gender: string | null;
  linked_app_player_id: string | null;
};

function parsePositiveInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ crmParentId: string }> }
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { crmParentId } = await ctx.params;
  const parentId = parsePositiveInt(crmParentId);
  if (!parentId) {
    return new Response("Invalid CRM parent id.", { status: 400 });
  }

  const crmPlayers = (await sql`
    SELECT
      cp.id,
      cp.parent_id,
      cp.name,
      cp.age,
      cp.team,
      cp.gender,
      p.id AS linked_app_player_id
    FROM crm_players cp
    LEFT JOIN players p ON p.crm_player_id = cp.id
    WHERE cp.parent_id = ${parentId}
    ORDER BY cp.name ASC, cp.id ASC
  `) as unknown as CrmPlayerRow[];

  return Response.json({ crmPlayers });
}
