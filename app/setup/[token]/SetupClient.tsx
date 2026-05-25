"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

type Player = {
  id: string;
  name: string;
  age: number | null;
  birthdate: string | null;
  team_level: string | null;
};

type Props = {
  token: string;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  players: Player[];
};

export function SetupClient({
  token,
  parentName,
  parentEmail,
  parentPhone,
  players,
}: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/parents/setup/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        identifier?: string;
        error?: string;
      } | null;

      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setDone(true);

      const identifier = data?.identifier ?? "";
      await signIn("parent-credentials", {
        identifier,
        password,
        callbackUrl: "/players",
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <div className="text-3xl">✓</div>
        <h2 className="mt-3 text-xl font-semibold text-gray-900">
          Account set up!
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Signing you in…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Your account</h2>
        <div className="mt-4 space-y-2 text-sm text-gray-700">
          {parentName && (
            <div>
              <span className="font-medium text-gray-500">Name:</span>{" "}
              {parentName}
            </div>
          )}
          {parentEmail && (
            <div>
              <span className="font-medium text-gray-500">Email:</span>{" "}
              {parentEmail}
            </div>
          )}
          {parentPhone && (
            <div>
              <span className="font-medium text-gray-500">Phone:</span>{" "}
              {parentPhone}
            </div>
          )}
        </div>

        {players.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900">
              {players.length === 1 ? "Your player" : "Your players"}
            </h3>
            <div className="mt-3 space-y-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                >
                  <div className="text-sm font-semibold text-gray-900">
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {[
                      p.age != null ? `Age ${p.age}` : null,
                      p.team_level ?? null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Create your password</h2>
        <p className="mt-1 text-sm text-gray-600">
          Set a password to finish activating your account. You can log in with{" "}
          {parentEmail ? "your email" : "your phone"} and this password anytime.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="setup-password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="setup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="setup-confirm"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm password
            </label>
            <input
              id="setup-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Setting up…" : "Set up account"}
          </button>
        </form>
      </div>
    </div>
  );
}
