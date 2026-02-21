"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Parent = {
  id: string;
  name: string | null;
  secondary_parent_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

type Player = {
  id: string;
  parent_id: string;
  name: string;
  birthdate: string | null;
  birth_year: number | null;
  team_level: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  created_at: string;
  updated_at: string;
};

type PlayerWithParent = Player & {
  parentLabel: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

function labelForParent(parent: Parent) {
  return parent.name ?? parent.email ?? parent.phone ?? parent.id;
}

function generateSecurePassword(length = 20) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export default function PrivateSessionsClient() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [players, setPlayers] = useState<PlayerWithParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newParentEmail, setNewParentEmail] = useState("");
  const [newParentPhone, setNewParentPhone] = useState("");
  const [newParentName, setNewParentName] = useState("");
  const [newSecondaryParentName, setNewSecondaryParentName] = useState("");
  const [newParentPassword, setNewParentPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const [selectedParentId, setSelectedParentId] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerBirthdate, setNewPlayerBirthdate] = useState("");
  const [newPlayerTeamLevel, setNewPlayerTeamLevel] = useState("");
  const [newPlayerPrimaryPosition, setNewPlayerPrimaryPosition] = useState("");
  const [newPlayerSecondaryPosition, setNewPlayerSecondaryPosition] = useState("");

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const parentData = await api<{ parents: Parent[] }>("/api/admin/parents");
      const nextParents = parentData.parents ?? [];
      setParents(nextParents);

      const playerArrays = await Promise.all(
        nextParents.map(async (p) => {
          const data = await api<{ players: Player[] }>(
            `/api/admin/parents/${p.id}/players`
          );
          return (data.players ?? []).map((pl) => ({
            ...pl,
            parentLabel: labelForParent(p),
          }));
        })
      );

      const flatPlayers = playerArrays
        .flat()
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      setPlayers(flatPlayers);

      if (!selectedParentId && nextParents[0]) {
        setSelectedParentId(nextParents[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createParent() {
    setError(null);
    await api<{ parent: Parent }>("/api/admin/parents", {
      method: "POST",
      body: JSON.stringify({
        name: newParentName || undefined,
        secondary_parent_name: newSecondaryParentName || undefined,
        email: newParentEmail || undefined,
        phone: newParentPhone || undefined,
        password: newParentPassword,
      }),
    });

    setNewParentName("");
    setNewSecondaryParentName("");
    setNewParentEmail("");
    setNewParentPhone("");
    setNewParentPassword("");
    await loadAll();
  }

  async function createPlayer() {
    const name = newPlayerName.trim();
    if (!selectedParentId || !name) {
      setError("Select a parent and enter player name.");
      return;
    }

    setError(null);

    await api<{ player: Player }>(`/api/admin/parents/${selectedParentId}/players`, {
      method: "POST",
      body: JSON.stringify({
        name,
        birthdate: newPlayerBirthdate || undefined,
        team_level: newPlayerTeamLevel || undefined,
        primary_position: newPlayerPrimaryPosition || undefined,
        secondary_position: newPlayerSecondaryPosition || undefined,
      }),
    });

    setNewPlayerName("");
    setNewPlayerBirthdate("");
    setNewPlayerTeamLevel("");
    setNewPlayerPrimaryPosition("");
    setNewPlayerSecondaryPosition("");
    await loadAll();
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Private Sessions</h1>
            <p className="mt-1 text-sm text-gray-600">
              Choose parents or players, and manage private-session accounts.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
          >
            Back to admin
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm lg:col-span-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Parents</h2>
              <button
                type="button"
                onClick={() => void loadAll()}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:border-emerald-300"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-gray-600">Loading parents...</div>
            ) : (
              <div className="mt-4 space-y-2">
                {parents.map((parent) => (
                  <Link
                    key={parent.id}
                    href={`/admin/parent/${parent.id}`}
                    className="block rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 transition hover:border-emerald-300"
                  >
                    <div className="text-sm font-semibold text-gray-900">
                      {labelForParent(parent)}
                    </div>
                    {parent.secondary_parent_name && (
                      <div className="mt-1 text-xs text-gray-600">
                        Secondary parent: {parent.secondary_parent_name}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-600">Open parent profile</div>
                  </Link>
                ))}
                {parents.length === 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-gray-700">
                    No parents yet.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900">Players</h2>
            <p className="mt-1 text-sm text-gray-600">
              Jump directly into a player editor.
            </p>

            {loading ? (
              <div className="mt-4 text-sm text-gray-600">Loading players...</div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {players.map((player) => (
                  <Link
                    key={player.id}
                    href={`/admin/player/${player.id}`}
                    className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 transition hover:border-emerald-300"
                  >
                    <div className="text-sm font-semibold text-gray-900">{player.name}</div>
                    <div className="mt-1 text-xs text-gray-600">Parent: {player.parentLabel}</div>
                  </Link>
                ))}
                {players.length === 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-gray-700 sm:col-span-2">
                    No players yet.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Add New Parent</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={newParentName}
                onChange={(e) => setNewParentName(e.target.value)}
                placeholder="Parent name (optional)"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <input
                value={newSecondaryParentName}
                onChange={(e) => setNewSecondaryParentName(e.target.value)}
                placeholder="Second parent name (optional)"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <input
                value={newParentEmail}
                onChange={(e) => setNewParentEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <input
                value={newParentPhone}
                onChange={(e) => setNewParentPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={newParentPassword}
                onChange={(e) => {
                  setPasswordNotice(null);
                  setNewParentPassword(e.target.value);
                }}
                placeholder="Password"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const pw = generateSecurePassword();
                    setNewParentPassword(pw);
                    try {
                      await navigator.clipboard.writeText(pw);
                      setPasswordNotice("Generated and copied to clipboard.");
                    } catch {
                      setPasswordNotice("Generated password.");
                    }
                  }}
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700"
                >
                  Generate Password
                </button>
                {passwordNotice && <div className="text-xs text-gray-600">{passwordNotice}</div>}
              </div>
              <button
                type="button"
                onClick={() => void createParent()}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Add parent
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Add New Player</h2>
            <div className="mt-4 grid gap-3">
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              >
                <option value="">Select parent</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {labelForParent(p)}
                  </option>
                ))}
              </select>
              <input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player name"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={newPlayerBirthdate}
                onChange={(e) => setNewPlayerBirthdate(e.target.value)}
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <input
                value={newPlayerTeamLevel}
                onChange={(e) => setNewPlayerTeamLevel(e.target.value)}
                placeholder="Team / level"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={newPlayerPrimaryPosition}
                  onChange={(e) => setNewPlayerPrimaryPosition(e.target.value)}
                  placeholder="Primary position"
                  className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
                />
                <input
                  value={newPlayerSecondaryPosition}
                  onChange={(e) => setNewPlayerSecondaryPosition(e.target.value)}
                  placeholder="Secondary position"
                  className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => void createPlayer()}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Add player
              </button>
            </div>
          </section>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-gray-600">
          Tip: Click a parent to open `/admin/parent/[id]`, or click a player to open `/admin/player/[id]`.
        </div>
      </main>
    </div>
  );
}
