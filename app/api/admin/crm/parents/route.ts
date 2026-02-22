import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";

type CrmParentRow = {
  id: number;
  name: string;
  secondary_parent_name: string | null;
  email: string | null;
  phone: string | null;
  is_dead: boolean | null;
  linked_app_parent_id: string | null;
};

export async function GET(req: NextRequest) {
  const err = await assertAdmin(req);
  if (err) return err;

  const crmParents = (await sql`
    SELECT
      cp.id,
      cp.name,
      cp.secondary_parent_name,
      cp.email,
      cp.phone,
      cp.is_dead,
      p.id AS linked_app_parent_id
    FROM crm_parents cp
    LEFT JOIN parents p ON p.crm_parent_id = cp.id
    ORDER BY cp.is_dead ASC NULLS LAST, cp.name ASC, cp.id ASC
  `) as unknown as CrmParentRow[];

  return Response.json({ crmParents });
}
