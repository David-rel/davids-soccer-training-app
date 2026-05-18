import "server-only";
import { sql } from "@/db";
import { sendSmsViaTwilio } from "./twilio";

type ContactRow = { phone: string | null; name: string | null; player_name: string };

export async function getPlayerContact(playerId: string): Promise<ContactRow | null> {
  const rows = (await sql`
    SELECT pa.phone, pa.name, pl.name AS player_name
    FROM players pl
    JOIN parents pa ON pa.id = pl.parent_id
    WHERE pl.id = ${playerId}
    LIMIT 1
  `) as unknown as ContactRow[];
  return rows[0] ?? null;
}

export function fireAdminSms(phone: string, message: string) {
  Promise.resolve()
    .then(async () => {
      await sendSmsViaTwilio(message, { to: phone });
    })
    .catch(() => {});
}
