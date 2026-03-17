export const SHIRT_TITLE_BY_NAME: Record<string, string> = {
  "No Shirt": "Igniter",
  Black: "Builder",
  White: "Grinder",
  Green: "Playmaker",
  Navy: "Captain",
  Indigo: "Icon",
  Red: "Legend",
};

export const SHIRT_RANK_BY_NAME: Record<string, number> = {
  "No Shirt": 1,
  Black: 2,
  White: 3,
  Green: 4,
  Navy: 5,
  Indigo: 6,
  Red: 7,
};

export function getShirtRankForDisplay(shirtName: string | null | undefined) {
  return SHIRT_RANK_BY_NAME[shirtName ?? ""] ?? 1;
}

export function formatTitleWithOptionalShirt(input: {
  titleLevel: string;
  shirtLevel: string | null | undefined;
}) {
  const shirt = input.shirtLevel ?? "";
  if (!shirt || shirt === "No Shirt") {
    return input.titleLevel;
  }
  return `${input.titleLevel} (${shirt})`;
}

export function formatUnlockLabelForShirt(shirtLevel: string) {
  const title = SHIRT_TITLE_BY_NAME[shirtLevel] ?? "Unknown";
  if (shirtLevel === "No Shirt") {
    return title;
  }
  return `${title} (${shirtLevel})`;
}
