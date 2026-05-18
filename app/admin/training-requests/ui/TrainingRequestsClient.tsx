"use client";

import { useState } from "react";
import { CheckCircle, Trash2 } from "lucide-react";

type TrainingRequest = {
  id: string;
  parent_name: string;
  player_name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  availability: string;
  status: string;
  created_at: string;
};

export function TrainingRequestsClient({
  initialRequests,
}: {
  initialRequests: TrainingRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [acting, setActing] = useState<Record<string, "accepting" | "deleting">>({});

  async function handleAccept(id: string) {
    setActing((prev) => ({ ...prev, [id]: "accepting" }));
    const res = await fetch(`/api/admin/training-requests/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
    setActing((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }

  async function handleDelete(id: string) {
    setActing((prev) => ({ ...prev, [id]: "deleting" }));
    const res = await fetch(`/api/admin/training-requests/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
    setActing((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        No training requests yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((r) => {
        const busy = acting[r.id];
        return (
          <div
            key={r.id}
            className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-gray-900">{r.parent_name}</div>
                <div className="mt-0.5 text-sm text-gray-500">
                  Player: <span className="font-medium text-gray-700">{r.player_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void handleAccept(r.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {busy === "accepting" ? "Accepting…" : "Accept"}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void handleDelete(r.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {busy === "deleting" ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {r.phone && (
                <a href={`tel:${r.phone}`} className="text-emerald-700 hover:underline">
                  {r.phone}
                </a>
              )}
              {r.email && (
                <a href={`mailto:${r.email}`} className="text-emerald-700 hover:underline">
                  {r.email}
                </a>
              )}
              {r.location && <span className="text-gray-600">{r.location}</span>}
            </div>

            <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
              {r.availability}
            </div>

            <p className="mt-3 text-xs text-gray-400">
              {new Date(r.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              at{" "}
              {new Date(r.created_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
