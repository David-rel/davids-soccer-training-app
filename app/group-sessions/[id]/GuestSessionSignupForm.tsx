"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type GuestPlayerDraft = {
  firstName: string;
  lastName: string;
  birthday: string;
  preferredFoot: string;
  team: string;
  notes: string;
};

type Props = {
  sessionId: number;
  isFull: boolean;
  spotsLeft: number;
  sessionPrice: number | null;
};

function makeEmptyPlayer(): GuestPlayerDraft {
  return {
    firstName: "",
    lastName: "",
    birthday: "",
    preferredFoot: "",
    team: "",
    notes: "",
  };
}

function formatPrice(input: number | null) {
  if (!input || Number.isNaN(Number(input))) return "TBD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(input));
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function GuestSessionSignupForm({
  sessionId,
  isFull,
  spotsLeft,
  sessionPrice,
}: Props) {
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [players, setPlayers] = useState<GuestPlayerDraft[]>([makeEmptyPlayer()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const signupCount = players.length;
  const totalLabel = useMemo(() => {
    if (!sessionPrice || Number.isNaN(Number(sessionPrice))) return formatPrice(sessionPrice);
    return formatPrice(sessionPrice * signupCount);
  }, [sessionPrice, signupCount]);

  const updatePlayer = (
    index: number,
    field: keyof GuestPlayerDraft,
    value: string
  ) => {
    setPlayers((current) =>
      current.map((player, playerIndex) =>
        playerIndex === index ? { ...player, [field]: value } : player
      )
    );
  };

  const addPlayer = () => {
    setPlayers((current) => [...current, makeEmptyPlayer()]);
  };

  const removePlayer = (index: number) => {
    setPlayers((current) =>
      current.length <= 1
        ? current
        : current.filter((_, playerIndex) => playerIndex !== index)
    );
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isFull || isSubmitting) return;

    const cleanParentName = parentName.trim();
    const cleanParentEmail = parentEmail.trim().toLowerCase();
    const cleanParentPhone = parentPhone.trim();

    if (!cleanParentName || !cleanParentEmail || !cleanParentPhone || !password) {
      setError("Parent name, email, phone, and password are required.");
      return;
    }

    if (!isValidEmail(cleanParentEmail)) {
      setError("Enter a valid parent email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (players.length === 0) {
      setError("Add at least one player.");
      return;
    }

    if (players.length > spotsLeft) {
      setError(`Only ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining.`);
      return;
    }

    for (let i = 0; i < players.length; i += 1) {
      const player = players[i];
      if (!player.firstName.trim()) {
        setError(`Player ${i + 1}: first name is required.`);
        return;
      }
      if (!player.lastName.trim()) {
        setError(`Player ${i + 1}: last name is required.`);
        return;
      }
      if (!player.birthday) {
        setError(`Player ${i + 1}: birthday is required.`);
        return;
      }
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupSessionId: sessionId,
          emergencyContact: cleanParentName,
          contactEmail: cleanParentEmail,
          contactPhone: cleanParentPhone,
          parentName: cleanParentName,
          parentPassword: password,
          termsAccepted,
          players: players.map((player) => ({
            firstName: player.firstName.trim(),
            lastName: player.lastName.trim(),
            birthday: player.birthday,
            preferredFoot: player.preferredFoot || null,
            team: player.team.trim() || null,
            notes: player.notes.trim() || null,
          })),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error || "Unable to start checkout.");
        return;
      }

      if (!payload?.checkoutUrl) {
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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        New Parent Signup + Checkout
      </h2>
      <p className="text-sm text-gray-600 mb-5">
        Complete one form to create your app account, add player info, and continue to Stripe.
      </p>

      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Already have an account?{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/group-sessions/${sessionId}`)}`}
          className="font-semibold text-emerald-700 underline underline-offset-2"
        >
          Log in here
        </Link>
        .
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-gray-700">Parent full name *</span>
          <input
            value={parentName}
            onChange={(event) => setParentName(event.target.value)}
            required
            placeholder="Parent/guardian name"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black placeholder:text-gray-500 caret-black outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Parent email *</span>
          <input
            type="email"
            value={parentEmail}
            onChange={(event) => setParentEmail(event.target.value)}
            required
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black placeholder:text-gray-500 caret-black outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Parent phone *</span>
          <input
            value={parentPhone}
            onChange={(event) => setParentPhone(event.target.value)}
            required
            placeholder="Best number for updates"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black placeholder:text-gray-500 caret-black outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-gray-700">Create password *</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            placeholder="At least 6 characters"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black placeholder:text-gray-500 caret-black outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-700">Players signing up *</p>
          <button
            type="button"
            onClick={addPlayer}
            disabled={isFull || players.length >= spotsLeft}
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add another player
          </button>
        </div>

        <div className="mt-3 space-y-4">
          {players.map((player, index) => (
            <div
              key={`guest-player-${index + 1}`}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800">
                  Player {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  disabled={players.length === 1}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">First name *</span>
                  <input
                    value={player.firstName}
                    onChange={(event) =>
                      updatePlayer(index, "firstName", event.target.value)
                    }
                    required
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Last name *</span>
                  <input
                    value={player.lastName}
                    onChange={(event) =>
                      updatePlayer(index, "lastName", event.target.value)
                    }
                    required
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Birthday *</span>
                  <input
                    type="date"
                    value={player.birthday}
                    onChange={(event) =>
                      updatePlayer(index, "birthday", event.target.value)
                    }
                    required
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Preferred foot</span>
                  <select
                    value={player.preferredFoot}
                    onChange={(event) =>
                      updatePlayer(index, "preferredFoot", event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black outline-none focus:border-emerald-500"
                  >
                    <option value="">Select</option>
                    <option value="Left">Left</option>
                    <option value="Right">Right</option>
                    <option value="Both">Both</option>
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Team</span>
                  <input
                    value={player.team}
                    onChange={(event) =>
                      updatePlayer(index, "team", event.target.value)
                    }
                    placeholder="Club/team name"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Notes</span>
                  <textarea
                    value={player.notes}
                    onChange={(event) =>
                      updatePlayer(index, "notes", event.target.value)
                    }
                    rows={3}
                    placeholder="Optional development notes for coach"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-black outline-none focus:border-emerald-500"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p>
          <span className="font-semibold">Signups:</span> {signupCount}
        </p>
        <p>
          <span className="font-semibold">Price per player:</span> {formatPrice(sessionPrice)}
        </p>
        <p>
          <span className="font-semibold">Estimated total:</span> {totalLabel}
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
            signupCount === 0 ||
            signupCount > spotsLeft ||
            !termsAccepted
          }
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-6 py-3 font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isFull
            ? "Session Full"
            : isSubmitting
              ? "Starting Checkout..."
              : `Create Account + Continue to Checkout (${signupCount})`}
        </button>
      </div>
    </form>
  );
}
