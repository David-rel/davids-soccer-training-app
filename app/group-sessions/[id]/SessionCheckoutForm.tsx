"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  formatUsdPrice,
  getGroupSessionSignupPrice,
  GROUP_SESSION_PRIVATE_SIGNUP_PRICE,
  GROUP_SESSION_STANDARD_SIGNUP_PRICE,
} from "@/lib/groupSessionPricing";

type PlayerOption = {
  id: string;
  name: string;
  birthdate: string | null;
  age: number | null;
  dominant_foot: string | null;
  team_level: string | null;
  focus_areas: string | null;
  long_term_development_notes: string | null;
  in_privates: boolean;
};

type Props = {
  sessionId: number;
  isFull: boolean;
  spotsLeft: number;
  players: PlayerOption[];
  alreadySignedPlayerIds: string[];
  defaultEmergencyContact: string;
  defaultContactPhone: string;
  defaultContactEmail: string;
};

function hasAgeData(player: PlayerOption) {
  if (player.birthdate) return true;
  return Number.isInteger(player.age) && (player.age || 0) > 0;
}

export default function SessionCheckoutForm({
  sessionId,
  isFull,
  spotsLeft,
  players,
  alreadySignedPlayerIds,
  defaultEmergencyContact,
  defaultContactPhone,
  defaultContactEmail,
}: Props) {
  const alreadySignedSet = useMemo(
    () => new Set(alreadySignedPlayerIds),
    [alreadySignedPlayerIds]
  );
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [emergencyContact, setEmergencyContact] = useState(defaultEmergencyContact);
  const [contactPhone, setContactPhone] = useState(defaultContactPhone);
  const [contactEmail, setContactEmail] = useState(defaultContactEmail);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedPlayerIds((current) => {
      if (current.length > 0) return current;
      const firstAvailable = players.find(
        (player) => !alreadySignedSet.has(player.id)
      );
      return firstAvailable ? [firstAvailable.id] : [];
    });
  }, [players, alreadySignedSet]);

  const selectedPlayers = useMemo(
    () =>
      players.filter(
        (player) =>
          selectedPlayerIds.includes(player.id) && !alreadySignedSet.has(player.id)
      ),
    [players, selectedPlayerIds, alreadySignedSet]
  );
  const allAlreadySigned = players.length > 0 && players.every((player) => alreadySignedSet.has(player.id));

  const selectedCount = selectedPlayers.length;
  const selectedPlayersMissingAge = selectedPlayers.filter(
    (player) => !hasAgeData(player)
  );
  const selectedTotal = selectedPlayers.reduce(
    (total, player) => total + getGroupSessionSignupPrice(player.in_privates),
    0
  );
  const privateSelectedCount = selectedPlayers.filter(
    (player) => player.in_privates
  ).length;
  const standardSelectedCount = selectedCount - privateSelectedCount;

  const togglePlayer = (playerId: string) => {
    if (alreadySignedSet.has(playerId)) return;
    setSelectedPlayerIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }
      return [...current, playerId];
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isFull || isSubmitting) return;

    if (selectedPlayerIds.length === 0) {
      setError("Select at least one player to continue.");
      return;
    }

    if (selectedPlayerIds.length > spotsLeft) {
      setError(`Only ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining.`);
      return;
    }

    if (selectedPlayersMissingAge.length > 0) {
      setError(
        `Missing birthday/age for: ${selectedPlayersMissingAge
          .map((player) => player.name)
          .join(", ")}. Update player profile first.`
      );
      return;
    }

    if (!termsAccepted) {
      setError("You must agree to the Group Training Terms and Conditions.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/group-sessions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupSessionId: sessionId,
          playerIds: selectedPlayerIds,
          emergencyContact,
          contactPhone,
          contactEmail,
          termsAccepted,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Unable to start checkout.");
        return;
      }

      if (!payload.checkoutUrl) {
        setError("Missing checkout URL.");
        return;
      }

      window.location.href = payload.checkoutUrl;
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-3xl border-2 border-emerald-100 shadow-xl p-6 md:p-8"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Player Signup + Checkout</h2>
      <p className="text-sm text-gray-600 mb-5">
        Select how many players are signing up. Checkout total updates automatically.
      </p>

      {players.length === 0 ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 mb-5">
          No player profiles found on your account yet.
        </div>
      ) : allAlreadySigned ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 mb-5">
          You&apos;re already signed up for this session. Please email
          {" "}
          <span className="font-semibold">davidfalesct@gmail.com</span>
          {" "}
          to cancel/reschedule.
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">Players signing up *</p>
          <div className="space-y-3">
            {players.map((player) => {
              const checked = selectedPlayerIds.includes(player.id);
              const alreadySigned = alreadySignedSet.has(player.id);
              return (
                <label
                  key={player.id}
                  className={`block rounded-2xl border p-4 cursor-pointer transition ${
                    alreadySigned
                      ? "border-emerald-200 bg-emerald-100/70"
                      : checked
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-gray-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={alreadySigned}
                      onChange={() => togglePlayer(player.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900">{player.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Team: {player.team_level || "—"} • Foot: {player.dominant_foot || "—"}
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        Price:{" "}
                        {player.in_privates ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-gray-500 line-through">
                              {formatUsdPrice(GROUP_SESSION_STANDARD_SIGNUP_PRICE)}
                            </span>
                            <span className="font-semibold text-emerald-700">
                              {formatUsdPrice(GROUP_SESSION_PRIVATE_SIGNUP_PRICE)}
                            </span>
                          </span>
                        ) : (
                          <span>{formatUsdPrice(GROUP_SESSION_STANDARD_SIGNUP_PRICE)}</span>
                        )}
                      </div>
                      {player.in_privates ? (
                        <div className="mt-1 text-xs text-emerald-700">
                          Private package discount applied.
                        </div>
                      ) : null}
                      {!hasAgeData(player) ? (
                        <div className="mt-2 text-xs text-red-600">
                          Missing birthday/age in profile.
                        </div>
                      ) : null}
                      {alreadySigned ? (
                        <div className="mt-2 text-xs font-semibold text-emerald-700">
                          Already signed up. Email davidfalesct@gmail.com to cancel/reschedule.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-gray-700">Emergency contact *</span>
          <input
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            required
            placeholder="Parent/guardian name"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black placeholder:text-gray-500 caret-black outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Contact email *</span>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
            placeholder="Parent/guardian email"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black placeholder:text-gray-500 caret-black outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Contact phone</span>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Best number for updates"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black placeholder:text-gray-500 caret-black outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p>
          <span className="font-semibold">Signups:</span> {selectedCount}
        </p>
        {privateSelectedCount > 0 ? (
          <>
            <p>
              <span className="font-semibold">Price per player:</span>{" "}
              {formatUsdPrice(GROUP_SESSION_STANDARD_SIGNUP_PRICE)} standard •{" "}
              {formatUsdPrice(GROUP_SESSION_PRIVATE_SIGNUP_PRICE)} private package
            </p>
            <p>
              <span className="font-semibold">Selected at standard rate:</span>{" "}
              {standardSelectedCount}
            </p>
            <p>
              <span className="font-semibold">Selected at private rate:</span>{" "}
              {privateSelectedCount}
            </p>
          </>
        ) : (
          <p>
            <span className="font-semibold">Price per player:</span>{" "}
            {formatUsdPrice(GROUP_SESSION_STANDARD_SIGNUP_PRICE)}
          </p>
        )}
        <p>
          <span className="font-semibold">Estimated total:</span>{" "}
          {formatUsdPrice(selectedTotal)}
        </p>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(event) => setTermsAccepted(event.target.checked)}
          required
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span className="text-sm text-gray-700">
          I agree to the{" "}
          <a
            href="https://wryahmjgsiuml9bg.public.blob.vercel-storage.com/Group%20Training%20Terms%20and%20Conditions%20-%20Google%20Docs.pdf"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-emerald-700 underline underline-offset-2"
          >
            Group Training Terms and Conditions
          </a>
          .
        </span>
      </label>

      {error ? <p className="text-red-600 text-sm mt-4">{error}</p> : null}

      <div className="mt-6">
        <button
          type="submit"
          disabled={
            isFull ||
            isSubmitting ||
            players.length === 0 ||
            allAlreadySigned ||
            selectedCount === 0 ||
            selectedCount > spotsLeft ||
            !termsAccepted
          }
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-6 py-3 font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isFull
            ? "Session Full"
            : isSubmitting
              ? "Starting Checkout..."
              : `Continue to Checkout (${selectedCount})`}
        </button>
      </div>
    </form>
  );
}
