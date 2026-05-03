"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  callbackUrl?: string;
};

function cleanIdentifier(value: string) {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function LoginForm({ callbackUrl = "/players" }: Props) {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callback = searchParams.get("callbackUrl") || callbackUrl;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);

  const requestResetCode = async () => {
    const email = resetEmail.trim().toLowerCase();
    setResetError(null);
    setResetStatus(null);
    setLocalSuccess(null);

    if (!email) {
      setResetError("Email is required.");
      return;
    }

    setResetPending(true);
    try {
      const res = await fetch("/api/parents/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!res.ok) {
        setResetError(data?.error ?? "Could not send reset code.");
        return;
      }

      setResetEmail(email);
      setResetStep("confirm");
      setResetStatus("Reset code sent. Check your email.");
    } catch {
      setResetError("Could not send reset code.");
    } finally {
      setResetPending(false);
    }
  };

  const confirmResetCode = async () => {
    const email = resetEmail.trim().toLowerCase();
    const code = resetCode.replace(/\D/g, "");
    setResetError(null);
    setResetStatus(null);
    setLocalSuccess(null);

    if (!email) {
      setResetError("Email is required.");
      return;
    }
    if (code.length !== 6) {
      setResetError("Enter the 6-digit code.");
      return;
    }
    if (resetPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetPending(true);
    try {
      const res = await fetch("/api/parents/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code, password: resetPassword }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!res.ok) {
        setResetError(data?.error ?? "Could not reset password.");
        return;
      }

      setIdentifier(email);
      setPassword("");
      setResetCode("");
      setResetPassword("");
      setResetConfirmPassword("");
      setResetStep("request");
      setResetOpen(false);
      setLocalError(null);
      setLocalSuccess("Password reset. Sign in with your new password.");
      setResetStatus(null);
      setResetError(null);
    } catch {
      setResetError("Could not reset password.");
    } finally {
      setResetPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setLocalError(null);
          setLocalSuccess(null);

          const ident = cleanIdentifier(identifier);
          if (!ident) return setLocalError("Email or phone is required.");
          if (!password) return setLocalError("Password is required.");

          startTransition(async () => {
            await signIn("parent-credentials", {
              identifier: ident,
              password,
              callbackUrl: callback,
            });
          });
        }}
      >
        {(localError || error || localSuccess) && (
          <div
            className={[
              "rounded-xl border px-3 py-2 text-sm",
              localSuccess
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-800",
            ].join(" ")}
          >
            {localSuccess ?? localError ?? "Invalid email/phone or password."}
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
            placeholder="you@example.com or 5555555555"
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

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setResetOpen((current) => !current);
              setResetError(null);
              setResetStatus(null);
              setResetEmail(identifier.includes("@") ? identifier.trim().toLowerCase() : "");
            }}
            className="text-sm font-semibold text-emerald-700 underline underline-offset-2"
          >
            Forgot password?
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>

      {resetOpen ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-gray-900">
            Reset password
          </div>

          {(resetError || resetStatus) && (
            <div
              className={[
                "mt-3 rounded-xl border px-3 py-2 text-sm",
                resetError
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-white text-emerald-900",
              ].join(" ")}
            >
              {resetError ?? resetStatus}
            </div>
          )}

          {resetStep === "request" ? (
            <div className="mt-3 space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-700">
                  Account email
                </span>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              <button
                type="button"
                disabled={resetPending}
                onClick={requestResetCode}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {resetPending ? "Sending code..." : "Send reset code"}
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-700">
                  6-digit code
                </span>
                <input
                  value={resetCode}
                  onChange={(e) =>
                    setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="123456"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-700">
                  New password
                </span>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-700">
                  Confirm new password
                </span>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetStep("request");
                    setResetError(null);
                    setResetStatus(null);
                  }}
                  className="text-sm font-semibold text-emerald-700 underline underline-offset-2"
                >
                  Send a new code
                </button>
                <button
                  type="button"
                  disabled={resetPending}
                  onClick={confirmResetCode}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {resetPending ? "Resetting..." : "Reset password"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
