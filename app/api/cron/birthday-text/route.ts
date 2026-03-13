import { NextRequest } from "next/server";

import { sql } from "@/db";
import {
  BIRTHDAY_ALERT_TIMEZONE,
  buildBirthdayAlertMessage,
  getBirthdayAlertDateParts,
  getBirthdayAlertDatePartsForLocalDate,
  type BirthdayPlayer,
} from "@/lib/birthdayAlerts";
import { sendSmsViaTwilio } from "@/lib/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BirthdaySmsRunRow = {
  id: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isAuthorized(req: NextRequest) {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  if (!secret) {
    throw new Error("CRON_SECRET is not set.");
  }

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const requestedDate = req.nextUrl.searchParams.get("date");
    const testMode = req.nextUrl.searchParams.get("test") === "1";
    const { localDate, month, day, label } = requestedDate
      ? getBirthdayAlertDatePartsForLocalDate(requestedDate)
      : getBirthdayAlertDateParts();

    let runId: string | null = null;

    if (!testMode) {
      const inserted = (await sql`
        INSERT INTO birthday_sms_runs (local_date, timezone)
        VALUES (${localDate}::date, ${BIRTHDAY_ALERT_TIMEZONE})
        ON CONFLICT (local_date) DO NOTHING
        RETURNING id
      `) as unknown as BirthdaySmsRunRow[];

      runId = inserted[0]?.id ?? null;
      if (!runId) {
        return json({
          ok: true,
          skipped: true,
          reason: "Birthday SMS already processed for this Arizona date.",
          localDate,
          testMode,
        });
      }
    }

    try {
      const birthdays = (await sql`
        SELECT id, name, birthdate::text AS birthdate
        FROM players
        WHERE birthdate IS NOT NULL
          AND EXTRACT(MONTH FROM birthdate) = ${month}
          AND EXTRACT(DAY FROM birthdate) = ${day}
        ORDER BY lower(name) ASC, created_at ASC
      `) as unknown as BirthdayPlayer[];

      const message = buildBirthdayAlertMessage({
        label,
        players: birthdays,
      });

      const sms = await sendSmsViaTwilio(message);

      if (runId) {
        await sql`
          UPDATE birthday_sms_runs
          SET
            birthday_count = ${birthdays.length},
            birthday_names = ${JSON.stringify(
              birthdays.map((player) => player.name)
            )}::jsonb,
            message_body = ${message},
            twilio_message_sid = ${sms.sid},
            twilio_status = ${sms.status}
          WHERE id = ${runId}
        `;
      }

      return json({
        ok: true,
        localDate,
        timezone: BIRTHDAY_ALERT_TIMEZONE,
        testMode,
        birthdayCount: birthdays.length,
        birthdays: birthdays.map((player) => player.name),
        message,
        twilioMessageSid: sms.sid,
      });
    } catch (error) {
      if (runId) {
        await sql`DELETE FROM birthday_sms_runs WHERE id = ${runId}`;
      }
      throw error;
    }
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Birthday cron failed unexpectedly.",
      },
      500
    );
  }
}
