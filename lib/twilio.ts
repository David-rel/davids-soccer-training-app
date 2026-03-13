import "server-only";

function toE164(value: string | undefined, envName: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new Error(`${envName} is not set.`);
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    throw new Error(`${envName} is invalid.`);
  }

  if (raw.startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  throw new Error(`${envName} must be a valid E.164 or US phone number.`);
}

export type TwilioSmsResult = {
  sid: string;
  status: string | null;
};

type SendSmsOptions = {
  to?: string;
};

export async function sendSmsViaTwilio(
  body: string,
  options?: SendSmsOptions
): Promise<TwilioSmsResult> {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID ?? "").trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are not configured.");
  }

  const from = toE164(process.env.TWILIO_PHONE_NUMBER, "TWILIO_PHONE_NUMBER");
  const toRaw = options?.to ?? process.env.BIRTHDAY_ALERT_TO_PHONE;
  const to = toE164(
    toRaw,
    options?.to ? "TWILIO_SMS_TO_PHONE" : "BIRTHDAY_ALERT_TO_PHONE"
  );

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams({
    From: from,
    To: to,
    Body: body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    }
  );

  const payload = (await res.json().catch(() => null)) as
    | { sid?: string; status?: string | null; message?: string }
    | null;

  if (!res.ok) {
    throw new Error(
      payload?.message || `Twilio SMS request failed with status ${res.status}.`
    );
  }

  if (!payload?.sid) {
    throw new Error("Twilio SMS response did not include a message SID.");
  }

  return {
    sid: payload.sid,
    status: payload.status ?? null,
  };
}
