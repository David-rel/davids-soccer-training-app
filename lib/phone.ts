export function normalizePhoneDigits(
  value: string | null | undefined
): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizePhoneForStorage(
  value: string | null | undefined
): string | null {
  return normalizePhoneForLookup(value);
}

export function normalizePhoneForLookup(
  value: string | null | undefined
): string | null {
  const digits = normalizePhoneDigits(value);
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}
