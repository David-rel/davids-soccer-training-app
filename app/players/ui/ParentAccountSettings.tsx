"use client";

import { useMemo, useState, useTransition } from "react";

type Props = {
  initialEmail: string | null;
  initialPhone: string | null;
};

export function ParentAccountSettings({ initialEmail, initialPhone }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSaveContact = useMemo(() => {
    const e = email.trim();
    const p = phone.trim();
    return Boolean(e || p);
  }, [email, phone]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setSuccess(null);
          setOpen(true);
        }}
        className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
      >
        Login settings
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-white shadow-xl">
              <div className="flex items-center justify-between gap-4 border-b border-emerald-100 px-6 py-5">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Login settings
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Update your email/phone or change your password.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-emerald-50"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                {(error || success) && (
                  <div
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm",
                      error
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-900",
                    ].join(" ")}
                  >
                    {error ?? success}
                  </div>
                )}

                <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900">
                    Email & phone
                  </div>
                  <div className="mt-3 grid gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Email
                      </label>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Phone
                      </label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+15555555555"
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={isPending || !canSaveContact}
                      onClick={() => {
                        setError(null);
                        setSuccess(null);

                        const nextEmail = email.trim() || null;
                        const nextPhone = phone.trim() || null;

                        // Light client-side sanity checks (server enforces too)
                        if (!nextEmail && !nextPhone) {
                          setError("Email or phone is required.");
                          return;
                        }
                        if (nextEmail && !nextEmail.includes("@")) {
                          setError("Please enter a valid email.");
                          return;
                        }

                        startTransition(async () => {
                          try {
                            const res = await fetch("/api/parents/me", {
                              method: "PATCH",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({
                                email: nextEmail,
                                phone: nextPhone,
                              }),
                            });
                            const data = (await res
                              .json()
                              .catch(() => null)) as {
                              email?: string | null;
                              phone?: string | null;
                              error?: string;
                            } | null;
                            if (!res.ok) {
                              setError(
                                data?.error ?? "Could not update email/phone."
                              );
                              return;
                            }

                            setSuccess("Email/phone updated.");
                            setError(null);
                            setEmail(data?.email ?? nextEmail ?? "");
                            setPhone(data?.phone ?? nextPhone ?? "");
                          } catch {
                            setError("Could not update email/phone.");
                          }
                        });
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isPending ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900">
                    Change password
                  </div>
                  <div className="mt-3 grid gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Old password
                      </label>
                      <input
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        type="password"
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">
                        New password
                      </label>
                      <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        type="password"
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Confirm new password
                      </label>
                      <input
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        type="password"
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setError(null);
                        setSuccess(null);

                        if (!oldPassword)
                          return setError("Old password is required.");
                        if (!newPassword)
                          return setError("New password is required.");
                        if (newPassword.length < 8) {
                          return setError(
                            "New password must be at least 8 characters."
                          );
                        }
                        if (newPassword !== confirmNewPassword) {
                          return setError("New passwords do not match.");
                        }

                        startTransition(async () => {
                          try {
                            const res = await fetch("/api/parents/me", {
                              method: "POST",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({
                                oldPassword,
                                newPassword,
                              }),
                            });
                            const data = (await res
                              .json()
                              .catch(() => null)) as {
                              ok?: boolean;
                              error?: string;
                            } | null;
                            if (!res.ok) {
                              setError(
                                data?.error ?? "Could not change password."
                              );
                              return;
                            }

                            setSuccess("Password updated.");
                            setError(null);
                            setOldPassword("");
                            setNewPassword("");
                            setConfirmNewPassword("");
                          } catch {
                            setError("Could not change password.");
                          }
                        });
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isPending ? "Updating…" : "Update password"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
