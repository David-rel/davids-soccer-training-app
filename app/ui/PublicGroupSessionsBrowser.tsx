"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatUsdPrice,
  GROUP_SESSION_PRIVATE_SIGNUP_PRICE,
  GROUP_SESSION_STANDARD_SIGNUP_PRICE,
} from "@/lib/groupSessionPricing";

type SessionCard = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  session_date: string;
  session_date_end: string | null;
  location: string | null;
  price: number | null;
  spots_left: number;
};

type Props = {
  sessions: SessionCard[];
};

const GROUP_TIME_ZONE = "America/Phoenix";

function addMinutes(input: string | Date, minutes: number) {
  return new Date(new Date(input).getTime() + minutes * 60_000);
}

function formatSessionDate(input: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: GROUP_TIME_ZONE,
  }).format(new Date(input));
}

function formatSessionTimeRange(startInput: string, endInput: string | null) {
  const start = new Date(startInput);
  const end = endInput ? new Date(endInput) : addMinutes(start, 75);
  const format = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: GROUP_TIME_ZONE,
  });
  return `${format.format(start)} - ${format.format(end)}`;
}

export function PublicGroupSessionsBrowser({ sessions }: Props) {
  const [titleFilter, setTitleFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          sessions
            .map((session) => (session.location || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const needle = titleFilter.trim().toLowerCase();
    return sessions.filter((session) => {
      const titleMatch =
        !needle || session.title.toLowerCase().includes(needle);
      const locationMatch =
        locationFilter === "all" ||
        (session.location || "").trim() === locationFilter;
      return titleMatch && locationMatch;
    });
  }, [sessions, titleFilter, locationFilter]);

  return (
    <section className="py-10">
      <div className="mb-6 grid gap-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="session-title-filter">
            Filter by title
          </label>
          <input
            id="session-title-filter"
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            placeholder="e.g. Finishing, Ball Mastery"
            className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="session-location-filter">
            Filter by location
          </label>
          <select
            id="session-location-filter"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
          >
            <option value="all">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
          No upcoming sessions match those filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => (
            <Link
              key={session.id}
              href={`/group-sessions/${session.id}`}
              className="group overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              {session.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.image_url}
                  alt={session.title}
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="h-48 w-full bg-emerald-50" />
              )}

              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{formatSessionDate(session.session_date)}</p>
                <p className="text-sm text-gray-600">
                  {formatSessionTimeRange(session.session_date, session.session_date_end)}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  Location: {session.location || "TBD"}
                </p>
                <p className="text-sm text-gray-700">
                  Standard: {formatUsdPrice(GROUP_SESSION_STANDARD_SIGNUP_PRICE)} per
                  signup
                </p>
                <p className="text-sm text-emerald-700">
                  Private package:{" "}
                  <span className="line-through text-gray-500">
                    {formatUsdPrice(GROUP_SESSION_STANDARD_SIGNUP_PRICE)}
                  </span>{" "}
                  <span className="font-semibold">
                    {formatUsdPrice(GROUP_SESSION_PRIVATE_SIGNUP_PRICE)}
                  </span>
                </p>
                <p className="text-sm text-gray-700">
                  {session.spots_left} {session.spots_left === 1 ? "spot" : "spots"} left
                </p>

                <div className="mt-4 inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-emerald-700">
                  View details
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
