export function normalizePhoneForStorage(
  value: string | null | undefined
): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const hasPlus = raw.startsWith("+");
  return hasPlus ? `+${digits}` : digits;
}

export function normalizePhoneForLookup(
  value: string | null | undefined
): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}
