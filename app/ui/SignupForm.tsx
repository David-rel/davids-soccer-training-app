"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  callbackUrl?: string;
};

export function SignupForm({ callbackUrl = "/players" }: Props) {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const callback = searchParams.get("callbackUrl") || callbackUrl;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPhone = phone.trim();

        if (!trimmedEmail || !trimmedPhone || !password) {
          setError("Email, phone number, and password are required.");
          return;
        }

        startTransition(async () => {
          try {
            const response = await fetch("/api/parents/signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: trimmedEmail,
                phone: trimmedPhone,
                password,
              }),
            });

            const payload = (await response.json().catch(() => null)) as
              | { error?: string }
              | null;

            if (!response.ok) {
              setError(payload?.error ?? "Could not create account.");
              return;
            }

            await signIn("parent-credentials", {
              identifier: trimmedEmail,
              password,
              callbackUrl: callback,
            });
          } catch {
            setError("Could not create account.");
          }
        });
      }}
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 placeholder:text-gray-500 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-phone" className="block text-sm font-medium text-gray-700">
          Phone number
        </label>
        <input
          id="signup-phone"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          required
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 placeholder:text-gray-500 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 placeholder:text-gray-500 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
