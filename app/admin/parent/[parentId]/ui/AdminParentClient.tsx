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

function parentLabel(parent: Parent | null) {
  if (!parent) return "Parent";
  return parent.name ?? parent.email ?? parent.phone ?? parent.id;
}

export default function AdminParentClient(props: {
  params: Promise<{ parentId: string }>;
}) {
  const [parentId, setParentId] = useState<string | null>(null);
  const [parent, setParent] = useState<Parent | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [secondaryParentName, setSecondaryParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [isSavingParent, setIsSavingParent] = useState(false);
  const [parentSaveMsg, setParentSaveMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerBirthdate, setNewPlayerBirthdate] = useState("");
  const [newPlayerTeamLevel, setNewPlayerTeamLevel] = useState("");
  const [newPlayerPrimaryPosition, setNewPlayerPrimaryPosition] = useState("");
  const [newPlayerSecondaryPosition, setNewPlayerSecondaryPosition] = useState("");

  useEffect(() => {
    props.params.then((p) => setParentId(p.parentId));
  }, [props.params]);

  async function loadAll(id: string) {
    setLoading(true);
    setError(null);
    try {
      const [parentData, playersData] = await Promise.all([
        api<{ parent: Parent }>(`/api/admin/parents/${id}`),
        api<{ players: Player[] }>(`/api/admin/parents/${id}/players`),
      ]);
      setParent(parentData.parent);
      setPlayers(playersData.players ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load parent.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!parentId) return;
    void loadAll(parentId);
  }, [parentId]);

  useEffect(() => {
    if (!parent) return;
    setParentName(parent.name ?? "");
    setSecondaryParentName(parent.secondary_parent_name ?? "");
    setParentEmail(parent.email ?? "");
    setParentPhone(parent.phone ?? "");
  }, [parent]);

  async function saveParentInfo() {
    if (!parentId) return;

    setError(null);
    setParentSaveMsg(null);
    setIsSavingParent(true);
    try {
      const data = await api<{ parent: Parent }>(`/api/admin/parents/${parentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: parentName,
          secondary_parent_name: secondaryParentName,
          email: parentEmail,
          phone: parentPhone,
        }),
      });
      setParent(data.parent);
      setParentSaveMsg({ type: "success", text: "Parent info saved." });
    } catch (e) {
      setParentSaveMsg({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to save parent info.",
      });
    } finally {
      setIsSavingParent(false);
    }
  }

  async function createPlayer() {
    if (!parentId || !newPlayerName.trim()) {
      setError("Player name is required.");
      return;
    }

    setError(null);
    try {
      await api<{ player: Player }>(`/api/admin/parents/${parentId}/players`, {
        method: "POST",
        body: JSON.stringify({
          name: newPlayerName.trim(),
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
      await loadAll(parentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add player.");
    }
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{parentLabel(parent)}</h1>
            <p className="mt-1 text-sm text-gray-600">Parent profile and connected kids.</p>
            {parent?.secondary_parent_name && (
              <p className="mt-1 text-xs text-gray-600">
                Secondary parent: {parent.secondary_parent_name}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/private-sessions"
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-300"
            >
              Back to private sessions
            </Link>
            <button
              type="button"
              onClick={() => {
                if (parentId) void loadAll(parentId);
              }}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-300"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Parent Info</h2>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void saveParentInfo();
              }}
            >
              <input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Primary parent name"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <input
                value={secondaryParentName}
                onChange={(e) => setSecondaryParentName(e.target.value)}
                placeholder="Secondary parent name (optional)"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <input
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="Phone"
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={loading || isSavingParent}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {isSavingParent ? "Saving..." : "Save parent info"}
              </button>
              {parentSaveMsg && (
                <div
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    parentSaveMsg.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {parentSaveMsg.text}
                </div>
              )}
            </form>
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Add New Kid</h2>
            <div className="mt-4 grid gap-3">
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
                Add kid
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900">Connected Kids</h2>
            {loading ? (
              <div className="mt-4 text-sm text-gray-600">Loading kids...</div>
            ) : players.length === 0 ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-gray-700">
                No kids connected yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {players.map((player) => (
                  <Link
                    key={player.id}
                    href={`/admin/player/${player.id}`}
                    className="block rounded-2xl border border-emerald-200 bg-white px-4 py-3 transition hover:border-emerald-300"
                  >
                    <div className="text-sm font-semibold text-gray-900">{player.name}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      {player.team_level ?? "No team level"}
                      {player.primary_position ? ` | ${player.primary_position}` : ""}
                      {player.secondary_position ? ` / ${player.secondary_position}` : ""}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
