"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

const SNOOZE_COOKIE_KEY = "players_onboarding_snooze";
const SNOOZE_SECONDS = 30 * 60;

type PlayerSummary = {
  id: string;
  name: string;
  birthdate: string | null;
  team_level: string | null;
  dominant_foot: string | null;
  location: string | null;
  shirt_size: string | null;
};

type Props = {
  parent: {
    email: string | null;
    phone: string | null;
  };
  players: PlayerSummary[];
};

type RequiredField =
  | "name"
  | "team_level"
  | "birthdate"
  | "dominant_foot"
  | "location"
  | "shirt_size";

type PlayerDraft = {
  name: string;
  team_level: string;
  birthdate: string;
  dominant_foot: string;
  location: string;
  shirt_size: string;
};

const REQUIRED_FIELD_LABELS: Record<RequiredField, string> = {
  name: "Name",
  team_level: "Team / level",
  birthdate: "Birthday",
  dominant_foot: "Dominant foot",
  location: "Location",
  shirt_size: "Shirt size",
};

function clean(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function toPlayerDraft(player: PlayerSummary): PlayerDraft {
  return {
    name: clean(player.name),
    team_level: clean(player.team_level),
    birthdate: clean(player.birthdate),
    dominant_foot: clean(player.dominant_foot),
    location: clean(player.location),
    shirt_size: clean(player.shirt_size),
  };
}

function getMissingFields(player: PlayerDraft): RequiredField[] {
  return (
    [
      "name",
      "team_level",
      "birthdate",
      "dominant_foot",
      "location",
      "shirt_size",
    ] as const
  ).filter((field) => !clean(player[field]));
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return part.slice(name.length + 1);
    }
  }
  return null;
}

function setSnoozeCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${SNOOZE_COOKIE_KEY}=1; path=/; max-age=${SNOOZE_SECONDS}; samesite=lax`;
}

async function getErrorMessage(res: Response, fallback: string) {
  const body = await res.text().catch(() => "");
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body) as { error?: string };
    return parsed.error || fallback;
  } catch {
    return body;
  }
}

export function PlayersOnboardingModal({ parent, players }: Props) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(clean(parent.email));
  const [phone, setPhone] = useState(clean(parent.phone));
  const [playerDrafts, setPlayerDrafts] = useState<Record<string, PlayerDraft>>(
    () =>
      Object.fromEntries(players.map((player) => [player.id, toPlayerDraft(player)]))
  );

  const parentMissingEmail = !clean(parent.email);
  const parentMissingPhone = !clean(parent.phone);
  const parentNeedsInfo = parentMissingEmail || parentMissingPhone;

  const playerIdsNeedingInfoAtLoad = useMemo(
    () =>
      players
        .filter((player) => getMissingFields(toPlayerDraft(player)).length > 0)
        .map((player) => player.id),
    [players]
  );

  const [onboardingPlayerIds] = useState<string[]>(() => playerIdsNeedingInfoAtLoad);

  const onboardingPlayers = useMemo(
    () =>
      onboardingPlayerIds
        .map((playerId) => {
          const player = players.find((p) => p.id === playerId);
          if (!player) return null;
          const draft = playerDrafts[player.id] ?? toPlayerDraft(player);
          return {
            id: player.id,
            displayName: clean(draft.name) || "Player",
            draft,
            missingFields: getMissingFields(draft),
          };
        })
        .filter((player): player is NonNullable<typeof player> => Boolean(player)),
    [onboardingPlayerIds, playerDrafts, players]
  );

  const shouldPrompt = parentNeedsInfo || playerIdsNeedingInfoAtLoad.length > 0;

  useEffect(() => {
    if (!shouldPrompt) return;
    if (getCookieValue(SNOOZE_COOKIE_KEY)) return;
    setOpen(true);
  }, [shouldPrompt]);

  function updateDraft(
    playerId: string,
    field: keyof PlayerDraft,
    nextValue: string
  ) {
    setError(null);
    setPlayerDrafts((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: nextValue,
      },
    }));
  }

  function closeForNow() {
    setSnoozeCookie();
    setOpen(false);
    setError(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={closeForNow} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-emerald-100 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Quick profile setup
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Please fill in the missing details so your player profile is complete.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForNow}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-emerald-50"
              aria-label="Close onboarding"
            >
              X
            </button>
          </div>

          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            {parentNeedsInfo ? (
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Parent contact info
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Add your missing login/contact details.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Email {parentMissingEmail ? "(required)" : ""}
                    </label>
                    <input
                      value={email}
                      onChange={(e) => {
                        setError(null);
                        setEmail(e.target.value);
                      }}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Phone {parentMissingPhone ? "(required)" : ""}
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => {
                        setError(null);
                        setPhone(e.target.value);
                      }}
                      placeholder="+15555555555"
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {onboardingPlayers.map((player) => (
              <section
                key={player.id}
                className="rounded-2xl border border-emerald-100 bg-white p-4"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  {player.displayName}
                </h3>
                {player.missingFields.length > 0 ? (
                  <p className="mt-1 text-sm text-gray-600">
                    Missing:{" "}
                    {player.missingFields
                      .map((field) => REQUIRED_FIELD_LABELS[field])
                      .join(", ")}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-emerald-700">
                    All required fields entered.
                  </p>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Name
                    </label>
                    <input
                      value={player.draft.name}
                      onChange={(e) =>
                        updateDraft(player.id, "name", e.target.value)
                      }
                      placeholder="Player name"
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Team / level
                    </label>
                    <input
                      value={player.draft.team_level}
                      onChange={(e) =>
                        updateDraft(player.id, "team_level", e.target.value)
                      }
                      placeholder="Team / level"
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Birthday
                    </label>
                    <input
                      value={player.draft.birthdate}
                      onChange={(e) =>
                        updateDraft(player.id, "birthdate", e.target.value)
                      }
                      type="date"
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Dominant foot
                    </label>
                    <input
                      value={player.draft.dominant_foot}
                      onChange={(e) =>
                        updateDraft(player.id, "dominant_foot", e.target.value)
                      }
                      placeholder="Right / Left / Both"
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Location
                    </label>
                    <input
                      value={player.draft.location}
                      onChange={(e) =>
                        updateDraft(player.id, "location", e.target.value)
                      }
                      placeholder="City or area"
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Shirt size
                    </label>
                    <input
                      value={player.draft.shirt_size}
                      onChange={(e) =>
                        updateDraft(player.id, "shirt_size", e.target.value)
                      }
                      placeholder="e.g. Youth M"
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-emerald-100 px-6 py-4">
            <button
              type="button"
              onClick={closeForNow}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-emerald-50"
            >
              Do it later
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setError(null);

                startTransition(async () => {
                  try {
                    const trimmedEmail = clean(email);
                    const trimmedPhone = clean(phone);

                    if (parentMissingEmail && !trimmedEmail) {
                      throw new Error("Please add an email.");
                    }
                    if (parentMissingPhone && !trimmedPhone) {
                      throw new Error("Please add a phone number.");
                    }
                    if (trimmedEmail && !trimmedEmail.includes("@")) {
                      throw new Error("Please enter a valid email.");
                    }

                    for (const player of onboardingPlayers) {
                      const invalidBirthdate =
                        clean(player.draft.birthdate) &&
                        !/^\d{4}-\d{2}-\d{2}$/.test(clean(player.draft.birthdate));
                      if (invalidBirthdate) {
                        throw new Error(
                          `Please enter a valid birthday for ${player.displayName}.`
                        );
                      }

                      const remainingMissing = getMissingFields(player.draft);
                      if (remainingMissing.length > 0) {
                        throw new Error(
                          `Please complete ${player.displayName}: ${remainingMissing
                            .map((field) => REQUIRED_FIELD_LABELS[field])
                            .join(", ")}.`
                        );
                      }
                    }

                    if (parentNeedsInfo) {
                      const parentRes = await fetch("/api/parents/me", {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          email: trimmedEmail || null,
                          phone: trimmedPhone || null,
                        }),
                      });

                      if (!parentRes.ok) {
                        throw new Error(
                          await getErrorMessage(
                            parentRes,
                            "Could not update parent contact info."
                          )
                        );
                      }
                    }

                    for (const player of onboardingPlayers) {
                      const res = await fetch(`/api/players/${player.id}`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          name: clean(player.draft.name),
                          team_level: clean(player.draft.team_level),
                          birthdate: clean(player.draft.birthdate),
                          dominant_foot: clean(player.draft.dominant_foot),
                          location: clean(player.draft.location),
                          shirt_size: clean(player.draft.shirt_size),
                        }),
                      });

                      if (!res.ok) {
                        throw new Error(
                          await getErrorMessage(
                            res,
                            `Could not update ${player.displayName}.`
                          )
                        );
                      }
                    }

                    setOpen(false);
                  } catch (saveError) {
                    setError(
                      saveError instanceof Error
                        ? saveError.message
                        : "Could not save onboarding details."
                    );
                  }
                });
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Saving..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
