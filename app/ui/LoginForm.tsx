"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setLocalError(null);

        const ident = identifier.trim();
        if (!ident) return setLocalError("Email or phone is required.");
        if (!password) return setLocalError("Password is required.");

        startTransition(async () => {
          await signIn("parent-credentials", {
            identifier: ident,
            password,
            callbackUrl: "/players",
          });
        });
      }}
    >
      {(localError || error) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {localError ?? "Invalid email/phone or password."}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="identifier"
          className="block text-sm font-medium text-gray-700"
        >
          Email or phone
        </label>
        <input
          id="identifier"
          name="identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@example.com or +15555555555"
          autoComplete="username"
          required
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 placeholder:text-gray-500 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 placeholder:text-gray-500 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
