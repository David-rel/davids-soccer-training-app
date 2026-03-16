"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type WaiverRow = {
  id: string;
  playerName: string;
  playerBirthdate: string | null;
  parentGuardianName: string;
  phoneNumber: string | null;
  emergencyContact: string;
  signatureDate: string;
  createdAt: string;
  signedDocumentUrl: string | null;
};

type Props = {
  waivers: WaiverRow[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export default function AdminWaiversClient({ waivers }: Props) {
  const [search, setSearch] = useState("");
  const query = normalize(search);

  const filtered = useMemo(() => {
    if (!query) return waivers;
    return waivers.filter((row) => {
      const fields = [
        row.id,
        row.playerName,
        row.playerBirthdate,
        row.parentGuardianName,
        row.phoneNumber,
        row.emergencyContact,
        row.signatureDate,
      ];
      return fields.some((field) => normalize(field).includes(query));
    });
  }, [waivers, query]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Signed Waivers</h2>
            <p className="mt-1 text-sm text-gray-600">
              Search by player, parent, waiver phone number, emergency contact, or ID.
            </p>
          </div>
          <div className="text-sm font-semibold text-emerald-700">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search player, parent, waiver phone number, emergency contact, ID..."
            className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((row) => (
          <div
            key={row.id}
            className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{row.playerName}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Parent/Guardian: {row.parentGuardianName}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>ID: {row.id}</div>
                <div>Signed: {formatDate(row.createdAt)}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
              <div>Birthdate: {row.playerBirthdate || "—"}</div>
              <div>Signature Date: {row.signatureDate}</div>
              <div>Waiver Phone: {row.phoneNumber || "—"}</div>
              <div className="md:col-span-2">
                Emergency Contact: {row.emergencyContact}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {row.signedDocumentUrl ? (
                <Link
                  href={row.signedDocumentUrl}
                  target="_blank"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Open signed waiver
                </Link>
              ) : (
                <span className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-800">
                  Missing signed PDF URL
                </span>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-emerald-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            No signed waivers match this search.
          </div>
        ) : null}
      </div>
    </div>
  );
}
