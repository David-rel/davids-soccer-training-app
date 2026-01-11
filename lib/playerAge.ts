function normalizeBirthdate(birthdate: string | null | undefined) {
  if (!birthdate) return null;
  // Accept "YYYY-MM-DD" or ISO strings like "YYYY-MM-DDT00:00:00.000Z"
  const s = birthdate.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function getBirthYearFromBirthdate(
  birthdate: string | null | undefined
) {
  const norm = normalizeBirthdate(birthdate);
  if (!norm) return null;
  return Number(norm.slice(0, 4));
}

export function calculateAgeFromBirthdate(
  birthdate: string | null | undefined,
  now = new Date()
) {
  const norm = normalizeBirthdate(birthdate);
  if (!norm) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(norm);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;

  // Compare in local time; good enough for age.
  let age = now.getFullYear() - y;
  const hasHadBirthdayThisYear =
    now.getMonth() + 1 > mo ||
    (now.getMonth() + 1 === mo && now.getDate() >= d);
  if (!hasHadBirthdayThisYear) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export function ageGroupFromAge(age: number | null) {
  if (age === null) return null;
  if (age < 3 || age > 40) return null;
  return `U${age}`;
}
