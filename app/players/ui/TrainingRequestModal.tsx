"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, XCircle } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultParentName: string;
  defaultPlayerName: string;
  defaultPhone: string;
  defaultEmail: string;
  defaultLocation: string;
};

export function TrainingRequestModal({
  open,
  onClose,
  defaultParentName,
  defaultPlayerName,
  defaultPhone,
  defaultEmail,
  defaultLocation,
}: Props) {
  const [parentName, setParentName] = useState(defaultParentName);
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [location, setLocation] = useState(defaultLocation);
  const [availability, setAvailability] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setParentName(defaultParentName);
      setPlayerName(defaultPlayerName);
      setPhone(defaultPhone);
      setEmail(defaultEmail);
      setLocation(defaultLocation);
      setAvailability("");
      setError(null);
      setSuccess(false);
      setSubmitting(false);
    }
  }, [open, defaultParentName, defaultPlayerName, defaultPhone, defaultEmail, defaultLocation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentName.trim()) { setError("Please enter your name."); return; }
    if (!playerName.trim()) { setError("Please enter the player's name."); return; }
    if (!availability.trim()) { setError("Please enter your availability."); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/training-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          parent_name: parentName.trim(),
          player_name: playerName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          location: location.trim() || undefined,
          availability: availability.trim(),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to submit request.");
        return;
      }
      setSuccess(true);
      setTimeout(() => onClose(), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl bg-emerald-600 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Request a Training Time</h2>
            <p className="mt-0.5 text-sm text-emerald-100">
              Looking to get a 1-on-1 session started with Coach David? Fill in your info below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-emerald-100 transition hover:bg-emerald-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <div>
                <p className="text-base font-semibold text-gray-900">Request sent!</p>
                <p className="mt-1 text-sm text-gray-500">
                  Coach David will be in touch to confirm a time.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Player Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, field, or general area"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Days &amp; Times That Work <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="e.g. Tuesday after 4pm, Thursday evenings, Saturday mornings"
                  rows={3}
                  required
                  className="w-full resize-y rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send Request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
