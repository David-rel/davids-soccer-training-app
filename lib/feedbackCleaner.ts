import OpenAI from "openai";

const REQUIRED_HEADINGS = [
  "## Summary",
  "## Strengths",
  "## Areas To Improve",
  "## Next Session Focus",
];

function getResponseText(response: unknown) {
  const direct = (response as { output_text?: unknown }).output_text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return "";
}

function hasRequiredStructure(markdown: string) {
  if (!markdown) return false;
  if (/^\s*\|.+\|\s*$/m.test(markdown)) return false;

  const bulletPattern = /^\s*-\s+\S+/m;
  let lastIndex = -1;
  const lower = markdown.toLowerCase();
  const headingIndexes: number[] = [];
  for (let i = 0; i < REQUIRED_HEADINGS.length; i += 1) {
    const heading = REQUIRED_HEADINGS[i];
    const idx = lower.indexOf(heading.toLowerCase());
    if (idx === -1 || idx <= lastIndex) return false;
    lastIndex = idx;
    headingIndexes.push(idx);
  }

  for (let i = 0; i < REQUIRED_HEADINGS.length; i += 1) {
    const start = headingIndexes[i];
    const end = i + 1 < headingIndexes.length ? headingIndexes[i + 1] : markdown.length;
    const section = markdown.slice(start, end);
    if (!bulletPattern.test(section)) return false;
  }

  return true;
}

export async function generateParentFeedbackMarkdown(opts: {
  playerName: string;
  rawContent: string;
  title: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const openai = new OpenAI({ apiKey });
  let lastDraft = "";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const instructions =
      attempt === 1
        ? "Rewrite coach notes into parent-friendly markdown with clear headings and bullet-point sentences."
        : "Your previous draft failed format. Regenerate and follow structure exactly.";

    const input = [
      `Feedback title: ${opts.title}`,
      `Player name: ${opts.playerName}`,
      "",
      "Write markdown only. Do not use tables.",
      "Use exactly these headings in this order:",
      "## Summary",
      "## Strengths",
      "## Areas To Improve",
      "## Next Session Focus",
      "",
      "Rules:",
      "- Start with '# {Feedback title}'.",
      "- Under each H2 heading, write 3-5 bullet points.",
      "- Every bullet must be a complete sentence with specific detail.",
      "- Use '-' bullets only; no numbered lists.",
      "- Do not output paragraph blocks outside bullet points.",
      "- Do not use heading names as bullet items.",
      "- Do not invent details not in the raw notes.",
      "",
      "Raw coach notes:",
      opts.rawContent,
      attempt === 2 && lastDraft ? `\nPrevious draft:\n${lastDraft}` : "",
    ].join("\n");

    const response = await openai.responses.create({
      model: "gpt-5",
      instructions,
      input,
    });

    const draft = getResponseText(response);
    if (!draft) continue;

    lastDraft = draft;
    if (hasRequiredStructure(draft)) {
      return draft;
    }
  }

  if (lastDraft) {
    return lastDraft;
  }

  throw new Error("Model returned empty feedback.");
}
