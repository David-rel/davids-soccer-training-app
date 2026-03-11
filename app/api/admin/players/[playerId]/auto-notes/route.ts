import { NextRequest } from "next/server";

import { assertAdmin } from "@/lib/adminAuth";
import { sql } from "@/db";
import { CHAT_MODEL, openai } from "@/lib/openai";

type GeneratedSkill = {
  rating: number;
  notes: string;
};

type GeneratedProfile = {
  strengths: string;
  focus_areas: string;
  long_term_development_notes: string;
  skills: {
    first_touch: GeneratedSkill;
    one_v_one_ability: GeneratedSkill;
    passing_technique: GeneratedSkill;
    shot_technique: GeneratedSkill;
    vision_recognition: GeneratedSkill;
    great_soccer_habits: GeneratedSkill;
  };
  goals: string[];
};

function getResponseText(response: unknown) {
  const direct = (response as { output_text?: unknown }).output_text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return "";
}

function parseJsonObject(raw: string) {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Model did not return valid JSON.");
    }
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  }
}

function sentenceParts(text: string) {
  const matches = text.match(/[^.!?]+[.!?]+/g) ?? [];
  return matches.map((item) => item.trim()).filter(Boolean);
}

function normalizeSentenceBlock(
  value: unknown,
  requiredCount: number,
  fieldName: string,
) {
  const raw = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!raw) throw new Error(`${fieldName} is empty.`);
  const parts = sentenceParts(raw);
  if (parts.length < requiredCount) {
    throw new Error(`${fieldName} must include at least ${requiredCount} sentences.`);
  }
  return parts.slice(0, requiredCount).join(" ");
}

function normalizeSkill(raw: unknown, fieldName: string): GeneratedSkill {
  const obj = (raw ?? {}) as { rating?: unknown; notes?: unknown };
  const parsedRating = Number(obj.rating);
  const rating = Number.isFinite(parsedRating)
    ? Math.max(2, Math.min(4, Math.round(parsedRating)))
    : 3;

  const notesRaw = String(obj.notes ?? "").replace(/\s+/g, " ").trim();
  const parts = sentenceParts(notesRaw);
  if (parts.length < 2) {
    throw new Error(`${fieldName}.notes must include at least 2 sentences.`);
  }
  const notes = parts.slice(0, 3).join(" ");

  return { rating, notes };
}

function normalizeGoals(raw: unknown) {
  const base = Array.isArray(raw) ? raw : [];
  const dedupe = new Set<string>();
  const goals: string[] = [];

  for (const item of base) {
    const normalized = String(item ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) continue;
    const short = normalized.split(" ").slice(0, 4).join(" ");
    const key = short.toLowerCase();
    if (key && !dedupe.has(key)) {
      dedupe.add(key);
      goals.push(short);
    }
    if (goals.length >= 2) break;
  }

  const fallbacks = ["20 right-foot juggles", "20 left-foot juggles"];
  for (const fallback of fallbacks) {
    if (goals.length >= 2) break;
    const key = fallback.toLowerCase();
    if (!dedupe.has(key)) {
      dedupe.add(key);
      goals.push(fallback);
    }
  }

  return goals.slice(0, 2);
}

function normalizeGeneratedProfile(raw: Record<string, unknown>): GeneratedProfile {
  const skillsRaw = (raw.skills ?? {}) as Record<string, unknown>;
  return {
    strengths: normalizeSentenceBlock(raw.strengths, 3, "strengths"),
    focus_areas: normalizeSentenceBlock(raw.focus_areas, 3, "focus_areas"),
    long_term_development_notes: normalizeSentenceBlock(
      raw.long_term_development_notes,
      3,
      "long_term_development_notes",
    ),
    skills: {
      first_touch: normalizeSkill(skillsRaw.first_touch, "skills.first_touch"),
      one_v_one_ability: normalizeSkill(
        skillsRaw.one_v_one_ability,
        "skills.one_v_one_ability",
      ),
      passing_technique: normalizeSkill(
        skillsRaw.passing_technique,
        "skills.passing_technique",
      ),
      shot_technique: normalizeSkill(
        skillsRaw.shot_technique,
        "skills.shot_technique",
      ),
      vision_recognition: normalizeSkill(
        skillsRaw.vision_recognition,
        "skills.vision_recognition",
      ),
      great_soccer_habits: normalizeSkill(
        skillsRaw.great_soccer_habits,
        "skills.great_soccer_habits",
      ),
    },
    goals: normalizeGoals(raw.goals),
  };
}

async function generateProfileFromFeedback(params: {
  playerName: string;
  feedbackText: string;
}) {
  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await openai.responses.create({
      model: CHAT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are a soccer coach assistant.",
                "Use only the provided feedback notes.",
                "Return strict JSON only (no markdown).",
                "Requirements:",
                '- "strengths": exactly 3 complete sentences.',
                '- "focus_areas": exactly 3 complete sentences.',
                '- "long_term_development_notes": exactly 3 complete sentences.',
                '- "skills": object with keys:',
                "  first_touch, one_v_one_ability, passing_technique, shot_technique, vision_recognition, great_soccer_habits.",
                "- Each skill has:",
                '  "rating" integer from 2 to 4 only.',
                '  "notes" with 2-3 complete sentences.',
                '- "goals": array of exactly 2 short measurable goals, each 2-4 words max.',
                "Do not use rating 1 or 5.",
                "Do not invent details that are not grounded by the feedback.",
                attempt > 1 && lastError
                  ? `Previous output failed validation: ${lastError}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Player: ${params.playerName}`,
                "",
                "Latest feedback entries:",
                params.feedbackText,
                "",
                "Return JSON with shape:",
                '{"strengths":"...","focus_areas":"...","long_term_development_notes":"...","skills":{"first_touch":{"rating":3,"notes":"..."},"one_v_one_ability":{"rating":3,"notes":"..."},"passing_technique":{"rating":3,"notes":"..."},"shot_technique":{"rating":3,"notes":"..."},"vision_recognition":{"rating":3,"notes":"..."},"great_soccer_habits":{"rating":3,"notes":"..."}},"goals":["goal one","goal two"]}',
              ].join("\n"),
            },
          ],
        },
      ],
    });

    const outputText = getResponseText(response);
    if (!outputText) {
      lastError = "Model returned empty output.";
      continue;
    }

    try {
      const parsed = parseJsonObject(outputText);
      return normalizeGeneratedProfile(parsed);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Invalid model output.";
    }
  }

  throw new Error(
    lastError || "Could not generate profile updates from feedback.",
  );
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> },
) {
  const err = await assertAdmin(req);
  if (err) return err;

  const { playerId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as
    | { include_goals?: boolean }
    | null;
  const includeGoals = Boolean(body?.include_goals);

  const playerRows = (await sql`
    SELECT id, name
    FROM players
    WHERE id = ${playerId}
    LIMIT 1
  `) as unknown as Array<{ id: string; name: string }>;
  const player = playerRows[0];
  if (!player) return new Response("Player not found", { status: 404 });

  const feedbackRows = (await sql`
    SELECT id, title, created_at, raw_content, cleaned_markdown_content
    FROM player_feedback
    WHERE player_id = ${playerId}
    ORDER BY created_at DESC
    LIMIT 4
  `) as unknown as Array<{
    id: string;
    title: string;
    created_at: string;
    raw_content: string;
    cleaned_markdown_content: string | null;
  }>;

  if (feedbackRows.length === 0) {
    return new Response("No feedback found for this player.", { status: 400 });
  }

  const feedbackText = feedbackRows
    .map((entry, idx) => {
      const date = new Date(entry.created_at).toISOString().slice(0, 10);
      const content = (
        entry.cleaned_markdown_content?.trim() || entry.raw_content
      ).trim();
      return `Feedback ${idx + 1} (${date}) ${entry.title}\n${content}`;
    })
    .join("\n\n-----\n\n");

  let generated: GeneratedProfile;
  try {
    generated = await generateProfileFromFeedback({
      playerName: player.name,
      feedbackText,
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Failed to generate notes.",
      { status: 500 },
    );
  }

  await sql`
    UPDATE players
    SET
      strengths = ${generated.strengths},
      focus_areas = ${generated.focus_areas},
      long_term_development_notes = ${generated.long_term_development_notes},
      first_touch_rating = ${generated.skills.first_touch.rating},
      first_touch_notes = ${generated.skills.first_touch.notes},
      one_v_one_ability_rating = ${generated.skills.one_v_one_ability.rating},
      one_v_one_ability_notes = ${generated.skills.one_v_one_ability.notes},
      passing_technique_rating = ${generated.skills.passing_technique.rating},
      passing_technique_notes = ${generated.skills.passing_technique.notes},
      shot_technique_rating = ${generated.skills.shot_technique.rating},
      shot_technique_notes = ${generated.skills.shot_technique.notes},
      vision_recognition_rating = ${generated.skills.vision_recognition.rating},
      vision_recognition_notes = ${generated.skills.vision_recognition.notes},
      great_soccer_habits_rating = ${generated.skills.great_soccer_habits.rating},
      great_soccer_habits_notes = ${generated.skills.great_soccer_habits.notes},
      notes_last_auto_refresh_at = now(),
      updated_at = now()
    WHERE id = ${playerId}
  `;

  let goalsCreated = 0;
  if (includeGoals) {
    const dueDateRows = (await sql`
      SELECT (CURRENT_DATE + INTERVAL '21 days')::date::text AS due_date
    `) as unknown as Array<{ due_date: string }>;
    const dueDate = dueDateRows[0]?.due_date ?? null;

    if (dueDate) {
      for (const goalName of generated.goals) {
        const inserted = (await sql`
          INSERT INTO player_goals (player_id, name, due_date, completed, completed_at, set_by)
          SELECT
            ${playerId},
            ${goalName},
            ${dueDate}::date,
            false,
            NULL,
            'coach'
          WHERE NOT EXISTS (
            SELECT 1
            FROM player_goals
            WHERE player_id = ${playerId}
              AND set_by = 'coach'
              AND completed = false
              AND due_date = ${dueDate}::date
              AND lower(name) = lower(${goalName})
          )
          RETURNING id
        `) as unknown as Array<{ id: string }>;
        goalsCreated += inserted.length;
      }
    }
  }

  return Response.json({
    ok: true,
    feedback_used: feedbackRows.length,
    goals_created: goalsCreated,
    notes_last_auto_refresh_at: new Date().toISOString(),
  });
}
