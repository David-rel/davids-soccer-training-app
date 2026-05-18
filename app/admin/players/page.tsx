"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight, Users } from "lucide-react";

type Parent = {
  id: string;
  name: string | null;
  email: string | null;
};

type Player = {
  id: string;
  parent_id: string;
  name: string;
  team_level: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  birthdate: string | null;
  profile_photo_url: string | null;
  parentName: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadPlayers() {
    setLoading(true);
    setError(null);
    try {
      const { parents } = await apiFetch<{ parents: Parent[] }>("/api/admin/parents");

      const playerArrays = await Promise.all(
        (parents ?? []).map(async (p) => {
          const { players: pls } = await apiFetch<{ players: Player[] }>(
            `/api/admin/parents/${p.id}/players`
          );
          return (pls ?? []).map((pl) => ({
            ...pl,
            parentName: p.name ?? p.email ?? p.id,
          }));
        })
      );

      setPlayers(
        playerArrays.flat().sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load players.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlayers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) =>
      [p.name, p.parentName, p.team_level, p.primary_position, p.secondary_position]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [players, search]);

  return (
    <div className="min-h-screen bg-emerald-50">
      <header className="sticky top-0 z-10 border-b border-emerald-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/icon.png" alt="Admin" width={36} height={36} className="h-9 w-9 rounded-xl" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Admin</div>
              <div className="text-sm font-bold text-gray-900">Players</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <span className="text-xs text-gray-400">{players.length} players</span>
            )}
            <Link
              href="/admin"
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              ← Admin home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, parent, team, position…"
            className="w-full rounded-2xl border border-emerald-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
          />
          {search && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading players…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">
              {search ? "No players match your search." : "No players yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((player) => (
              <Link
                key={player.id}
                href={`/admin/player/${player.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                {player.profile_photo_url ? (
                  <Image
                    src={player.profile_photo_url}
                    alt={player.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {getInitials(player.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-gray-900">{player.name}</div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">{player.parentName}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {player.team_level && (
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        {player.team_level}
                      </span>
                    )}
                    {player.primary_position && (
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                        {player.primary_position}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
