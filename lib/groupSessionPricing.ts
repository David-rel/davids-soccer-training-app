export const GROUP_SESSION_STANDARD_SIGNUP_PRICE = 50;
export const GROUP_SESSION_PRIVATE_DISCOUNT_RATE = 0.4;
export const GROUP_SESSION_PRIVATE_SIGNUP_PRICE =
  GROUP_SESSION_STANDARD_SIGNUP_PRICE * (1 - GROUP_SESSION_PRIVATE_DISCOUNT_RATE);

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function resolveGroupSessionBasePrice(sessionPrice?: number | null) {
  const parsed = Number(sessionPrice);
  if (Number.isFinite(parsed) && parsed > 0) {
    return roundCurrency(parsed);
  }
  return GROUP_SESSION_STANDARD_SIGNUP_PRICE;
}

export function getGroupSessionSignupPrice(
  inPrivates: boolean,
  sessionPrice?: number | null
) {
  const basePrice = resolveGroupSessionBasePrice(sessionPrice);
  return inPrivates
    ? roundCurrency(basePrice * (1 - GROUP_SESSION_PRIVATE_DISCOUNT_RATE))
    : basePrice;
}

export function formatUsdPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
