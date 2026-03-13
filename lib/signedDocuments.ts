export const PRIVATE_TRAINING_WAIVER_DOCUMENT = {
  key: "one_on_one_private_training_agreement_liability_waiver",
  title: "1 on 1 Private Soccer Training Agreement and Liability Waiver",
  url: "https://wryahmjgsiuml9bg.public.blob.vercel-storage.com/Private%20Soccer%20Training%20Agreement%20and%20Liability%20Waiver%20-%20Google%20Docs.pdf",
} as const;

export function normalizeComparableName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
