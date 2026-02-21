export function formatFeedbackTitleForDisplay(title: string) {
  const match =
    /^Feedback - (\d{4})-(\d{2})-(\d{2})(?: - (\d{2}))?$/.exec(title.trim());
  if (!match) return title;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const seq = match[4] ?? null;

  const localDate = new Date(year, month - 1, day);
  const formattedDate = Number.isNaN(localDate.getTime())
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : localDate.toLocaleDateString();

  return seq
    ? `Feedback - ${formattedDate} - ${seq}`
    : `Feedback - ${formattedDate}`;
}
