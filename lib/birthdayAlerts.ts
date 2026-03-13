import "server-only";

export const BIRTHDAY_ALERT_TIMEZONE = "America/Phoenix";

export type BirthdayPlayer = {
  id: string;
  name: string;
  birthdate: string;
};

function getDatePart(
  date: Date,
  part: "year" | "month" | "day",
  timeZone = BIRTHDAY_ALERT_TIMEZONE
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return (
    formatter.formatToParts(date).find((entry) => entry.type === part)?.value ?? ""
  );
}

export function getBirthdayAlertDateParts(now = new Date()) {
  const year = getDatePart(now, "year");
  const month = getDatePart(now, "month");
  const day = getDatePart(now, "day");
  const localDate = `${year}-${month}-${day}`;
  const monthNumber = Number(month);
  const dayNumber = Number(day);

  if (!year || !monthNumber || !dayNumber) {
    throw new Error("Failed to compute birthday alert date in America/Phoenix.");
  }

  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: BIRTHDAY_ALERT_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(now);

  return {
    localDate,
    month: monthNumber,
    day: dayNumber,
    label,
  };
}

export function getBirthdayAlertDatePartsForLocalDate(localDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) {
    throw new Error("date must be in YYYY-MM-DD format.");
  }

  const [, , month, day] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);

  if (!monthNumber || monthNumber < 1 || monthNumber > 12) {
    throw new Error("date has an invalid month.");
  }
  if (!dayNumber || dayNumber < 1 || dayNumber > 31) {
    throw new Error("date has an invalid day.");
  }

  const parsed = new Date(`${localDate}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("date could not be parsed.");
  }

  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: BIRTHDAY_ALERT_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);

  return {
    localDate,
    month: monthNumber,
    day: dayNumber,
    label,
  };
}

export function buildBirthdayAlertMessage(args: {
  label: string;
  players: BirthdayPlayer[];
}) {
  const names = args.players.map((player) => player.name);

  if (names.length === 0) {
    return `Birthday check for ${args.label} (Arizona): No player birthdays today.`;
  }

  const intro =
    names.length === 1
      ? `Birthday check for ${args.label} (Arizona): Today's birthday is`
      : `Birthday check for ${args.label} (Arizona): Today's birthdays are`;

  return `${intro} ${names.join(", ")}.`;
}
