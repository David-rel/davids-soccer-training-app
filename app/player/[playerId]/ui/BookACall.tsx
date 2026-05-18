"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, CheckCircle, XCircle } from "lucide-react";

type CallRequest = {
  id: string;
  player_id: string;
  parent_id: string;
  duration_minutes: number;
  availability: string;
  notes: string | null;
  status: "pending" | "seen";
  seen_at: string | null;
  created_at: string;
};

export function BookACall({ playerId }: { playerId: string }) {
  const [requests, setRequests] = useState<CallRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [duration, setDuration] = useState<30 | 60>(30);
  const [availability, setAvailability] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function loadRequests() {
    try {
      const res = await fetch(`/api/players/${playerId}/call-requests`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { requests: CallRequest[] };
        setRequests(data.requests);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!availability.trim()) {
      setError("Please enter your availability.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${playerId}/call-requests`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          duration_minutes: duration,
          availability: availability.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to submit request.");
        return;
      }
      const data = (await res.json()) as { request: CallRequest };
      setRequests((prev) => [data.request, ...prev]);
      setAvailability("");
      setNotes("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(requestId: string) {
    try {
      const res = await fetch(
        `/api/players/${playerId}/call-requests/${requestId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Request a Call with Coach David
          </h3>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Request sent! Coach David will reach out to confirm a time.
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {/* Duration */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Call Duration
            </label>
            <div className="flex gap-3">
              {([30, 60] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    duration === d
                      ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                      : "border-blue-200 bg-white text-gray-700 hover:border-blue-300"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  {d} minutes
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Your Availability <span className="text-red-500">*</span>
            </label>
            <textarea
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="List 2-3 days and times that work for you (e.g. Tuesday after 4pm, Thursday after 5pm)"
              rows={3}
              required
              className="w-full resize-y rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              What do you want to cover?{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything specific you want to cover?"
              rows={2}
              className="w-full resize-y rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send Call Request"}
            </button>
          </div>
        </form>
      </div>

      {/* Existing requests */}
      {!loading && requests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Your Requests</h4>
          {requests.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      r.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.status === "pending" ? "Pending" : "Seen"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    <Clock className="h-3 w-3" />
                    {r.duration_minutes} min
                  </span>
                </div>
                {r.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => void handleCancel(r.id)}
                    className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-700">{r.availability}</p>
              {r.notes && (
                <p className="mt-1 text-xs text-gray-500 italic">{r.notes}</p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                {new Date(r.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {!loading && requests.length === 0 && (
        <p className="text-center text-sm text-gray-400">
          No call requests yet. Submit one above!
        </p>
      )}
    </div>
  );
}
