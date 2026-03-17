export const GROUP_SESSION_STANDARD_SIGNUP_PRICE = 50;
export const GROUP_SESSION_PRIVATE_SIGNUP_PRICE = 30;

export function getGroupSessionSignupPrice(inPrivates: boolean) {
  return inPrivates
    ? GROUP_SESSION_PRIVATE_SIGNUP_PRICE
    : GROUP_SESSION_STANDARD_SIGNUP_PRICE;
}

export function formatUsdPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
