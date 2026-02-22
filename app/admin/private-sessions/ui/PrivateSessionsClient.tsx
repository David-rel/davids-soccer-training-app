"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Parent = {
  id: string;
  name: string | null;
  secondary_parent_name: string | null;
  email: string | null;
  phone: string | null;
  crm_parent_id: number | null;
  created_at: string;
  updated_at: string;
};

type Player = {
  id: string;
  parent_id: string;
  crm_player_id: number | null;
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

type CrmParent = {
  id: number;
  name: string;
  secondary_parent_name: string | null;
  email: string | null;
  phone: string | null;
  is_dead: boolean | null;
  linked_app_parent_id: string | null;
};

type CrmPlayer = {
  id: number;
  parent_id: number;
  name: string;
  age: number | null;
  team: string | null;
  gender: string | null;
  linked_app_player_id: string | null;
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

function labelForCrmParent(parent: CrmParent) {
  const email = parent.email?.trim() || "No email";
  const phone = parent.phone?.trim() || "No phone";
  return `${parent.name} • ${email} • ${phone}`;
}

function labelForCrmPlayer(player: CrmPlayer) {
  return player.team ? `${player.name} (${player.team})` : player.name;
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
  const [crmParents, setCrmParents] = useState<CrmParent[]>([]);
  const [crmPlayersForSelectedParent, setCrmPlayersForSelectedParent] =
    useState<CrmPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCrmParentId, setSelectedCrmParentId] = useState("");
  const [newParentName, setNewParentName] = useState("");
  const [newSecondaryParentName, setNewSecondaryParentName] = useState("");
  const [newParentEmail, setNewParentEmail] = useState("");
  const [newParentPhone, setNewParentPhone] = useState("");
  const [newParentPassword, setNewParentPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedCrmPlayerId, setSelectedCrmPlayerId] = useState("");
  const [newPlayerBirthdate, setNewPlayerBirthdate] = useState("");
  const [newPlayerTeamLevel, setNewPlayerTeamLevel] = useState("");
  const [newPlayerPrimaryPosition, setNewPlayerPrimaryPosition] = useState("");
  const [newPlayerSecondaryPosition, setNewPlayerSecondaryPosition] = useState("");
  const [searchScope, setSearchScope] = useState<"players" | "parents">("players");
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedSearchQuery = useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery]
  );

  const filteredParents = useMemo(() => {
    if (!normalizedSearchQuery || searchScope !== "parents") return parents;
    return parents.filter((parent) => {
      const fields = [
        parent.name,
        parent.secondary_parent_name,
        parent.email,
        parent.phone,
        parent.crm_parent_id ? String(parent.crm_parent_id) : null,
      ];
      return fields.some((value) =>
        value?.toLowerCase().includes(normalizedSearchQuery)
      );
    });
  }, [parents, normalizedSearchQuery, searchScope]);

  const filteredPlayers = useMemo(() => {
    if (!normalizedSearchQuery || searchScope !== "players") return players;
    return players.filter((player) => {
      const fields = [
        player.name,
        player.parentLabel,
        player.team_level,
        player.primary_position,
        player.secondary_position,
        player.crm_player_id ? String(player.crm_player_id) : null,
      ];
      return fields.some((value) =>
        value?.toLowerCase().includes(normalizedSearchQuery)
      );
    });
  }, [players, normalizedSearchQuery, searchScope]);

  const selectedParent = useMemo(
    () => parents.find((p) => p.id === selectedParentId) ?? null,
    [parents, selectedParentId]
  );

  const unlinkedCrmParents = useMemo(
    () => crmParents.filter((p) => !p.linked_app_parent_id),
    [crmParents]
  );

  const selectedCrmParent = useMemo(
    () => crmParents.find((p) => String(p.id) === selectedCrmParentId) ?? null,
    [crmParents, selectedCrmParentId]
  );

  const availableCrmPlayers = useMemo(
    () => crmPlayersForSelectedParent.filter((p) => !p.linked_app_player_id),
    [crmPlayersForSelectedParent]
  );

  const selectedCrmPlayer = useMemo(
    () =>
      crmPlayersForSelectedParent.find((p) => String(p.id) === selectedCrmPlayerId) ??
      null,
    [crmPlayersForSelectedParent, selectedCrmPlayerId]
  );

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [parentData, crmParentData] = await Promise.all([
        api<{ parents: Parent[] }>("/api/admin/parents"),
        api<{ crmParents: CrmParent[] }>("/api/admin/crm/parents"),
      ]);

      const nextParents = parentData.parents ?? [];
      const nextCrmParents = crmParentData.crmParents ?? [];
      setParents(nextParents);
      setCrmParents(nextCrmParents);

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

      setSelectedParentId((prev) => {
        if (prev && nextParents.some((p) => p.id === prev)) return prev;
        return nextParents[0]?.id ?? "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCrmPlayersForParent(crmParentId: number) {
    const data = await api<{ crmPlayers: CrmPlayer[] }>(
      `/api/admin/crm/parents/${crmParentId}/players`
    );
    return data.crmPlayers ?? [];
  }

  function applyCrmPlayers(nextPlayers: CrmPlayer[]) {
    setCrmPlayersForSelectedParent(nextPlayers);
    setSelectedCrmPlayerId((prev) => {
      if (
        prev &&
        nextPlayers.some((p) => String(p.id) === prev && !p.linked_app_player_id)
      ) {
        return prev;
      }
      const firstOpen = nextPlayers.find((p) => !p.linked_app_player_id);
      return firstOpen ? String(firstOpen.id) : "";
    });
  }

  useEffect(() => {
    setSelectedCrmParentId((prev) => {
      if (prev && unlinkedCrmParents.some((p) => String(p.id) === prev)) {
        return prev;
      }
      return unlinkedCrmParents[0] ? String(unlinkedCrmParents[0].id) : "";
    });
  }, [unlinkedCrmParents]);

  useEffect(() => {
    if (!selectedCrmParent) {
      setNewParentName("");
      setNewSecondaryParentName("");
      setNewParentEmail("");
      setNewParentPhone("");
      return;
    }
    setNewParentName(selectedCrmParent.name ?? "");
    setNewSecondaryParentName(selectedCrmParent.secondary_parent_name ?? "");
    setNewParentEmail(selectedCrmParent.email ?? "");
    setNewParentPhone(selectedCrmParent.phone ?? "");
  }, [selectedCrmParent]);

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    const crmParentId = selectedParent?.crm_parent_id;
    if (!crmParentId) {
      setCrmPlayersForSelectedParent([]);
      setSelectedCrmPlayerId("");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const nextPlayers = await fetchCrmPlayersForParent(crmParentId);
        if (cancelled) return;
        applyCrmPlayers(nextPlayers);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "Failed to load CRM players."
        );
        setCrmPlayersForSelectedParent([]);
        setSelectedCrmPlayerId("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedParent?.crm_parent_id]);

  async function createParent() {
    if (!selectedCrmParentId) {
      setError("Select a CRM parent first.");
      return;
    }

    setError(null);
    await api<{ parent: Parent }>("/api/admin/parents", {
      method: "POST",
      body: JSON.stringify({
        crm_parent_id: selectedCrmParentId,
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
    if (!selectedParentId) {
      setError("Select an app parent first.");
      return;
    }
    if (!selectedParent?.crm_parent_id) {
      setError("Selected app parent is not linked to a CRM parent.");
      return;
    }
    if (!selectedCrmPlayerId) {
      setError("Select a CRM player first.");
      return;
    }

    setError(null);

    await api<{ player: Player }>(`/api/admin/parents/${selectedParentId}/players`, {
      method: "POST",
      body: JSON.stringify({
        crm_player_id: selectedCrmPlayerId,
        birthdate: newPlayerBirthdate || undefined,
        team_level: newPlayerTeamLevel || undefined,
        primary_position: newPlayerPrimaryPosition || undefined,
        secondary_position: newPlayerSecondaryPosition || undefined,
      }),
    });

    setNewPlayerBirthdate("");
    setNewPlayerTeamLevel("");
    setNewPlayerPrimaryPosition("");
    setNewPlayerSecondaryPosition("");
    setSelectedCrmPlayerId("");
    await loadAll();
    const nextPlayers = await fetchCrmPlayersForParent(selectedParent.crm_parent_id);
    applyCrmPlayers(nextPlayers);
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

        <section className="mb-6 rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value as "players" | "parents")}
              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm sm:w-44"
            >
              <option value="players">Search players</option>
              <option value="parents">Search parents</option>
            </select>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchScope === "players"
                  ? "Search player name, parent, team, CRM ID..."
                  : "Search parent name, email, phone, CRM ID..."
              }
              className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
            />
          </div>
          {normalizedSearchQuery && (
            <p className="mt-2 text-xs text-gray-600">
              {searchScope === "players"
                ? `${filteredPlayers.length} player result${filteredPlayers.length === 1 ? "" : "s"}`
                : `${filteredParents.length} parent result${filteredParents.length === 1 ? "" : "s"}`}
            </p>
          )}
        </section>

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
                {filteredParents.map((parent) => (
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
                    <div className="mt-1 text-xs text-gray-600">
                      {parent.crm_parent_id
                        ? `CRM parent: ${parent.crm_parent_id}`
                        : "CRM parent: —"}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">Open parent profile</div>
                  </Link>
                ))}
                {filteredParents.length === 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-gray-700">
                    {normalizedSearchQuery && searchScope === "parents"
                      ? "No parents match your search."
                      : "No parents yet."}
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
                {filteredPlayers.map((player) => (
                  <Link
                    key={player.id}
                    href={`/admin/player/${player.id}`}
                    className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 transition hover:border-emerald-300"
                  >
                    <div className="text-sm font-semibold text-gray-900">{player.name}</div>
                    <div className="mt-1 text-xs text-gray-600">Parent: {player.parentLabel}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      {player.crm_player_id
                        ? `CRM player: ${player.crm_player_id}`
                        : "CRM player: —"}
                    </div>
                  </Link>
                ))}
                {filteredPlayers.length === 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-gray-700 sm:col-span-2">
                    {normalizedSearchQuery && searchScope === "players"
                      ? "No players match your search."
                      : "No players yet."}
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
              <select
                value={selectedCrmParentId}
                onChange={(e) => setSelectedCrmParentId(e.target.value)}
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              >
                <option value="">Select CRM parent</option>
                {unlinkedCrmParents.map((parent) => (
                  <option key={parent.id} value={String(parent.id)}>
                    {labelForCrmParent(parent)}
                  </option>
                ))}
              </select>
              {selectedCrmParent && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-gray-700">
                  <div>Name: {selectedCrmParent.name}</div>
                  <div>
                    Contact: {selectedCrmParent.email ?? selectedCrmParent.phone ?? "—"}
                  </div>
                  {selectedCrmParent.secondary_parent_name && (
                    <div>
                      Secondary parent: {selectedCrmParent.secondary_parent_name}
                    </div>
                  )}
                </div>
              )}
              <input
                value={newParentName}
                onChange={(e) => setNewParentName(e.target.value)}
                placeholder="Parent name"
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
              {unlinkedCrmParents.length === 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-gray-700">
                  All CRM parents are already linked.
                </div>
              )}
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
                disabled={!selectedCrmParentId}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Add parent from CRM
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
              {!selectedParent?.crm_parent_id ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Select an app parent linked to CRM to pull CRM players.
                </div>
              ) : (
                <>
                  <select
                    value={selectedCrmPlayerId}
                    onChange={(e) => setSelectedCrmPlayerId(e.target.value)}
                    className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select CRM player</option>
                    {availableCrmPlayers.map((player) => (
                      <option key={player.id} value={String(player.id)}>
                        {labelForCrmPlayer(player)}
                      </option>
                    ))}
                  </select>
                  {selectedCrmPlayer && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-gray-700">
                      <div>Name: {selectedCrmPlayer.name}</div>
                      <div>Team: {selectedCrmPlayer.team ?? "—"}</div>
                      <div>Age: {selectedCrmPlayer.age ?? "—"}</div>
                    </div>
                  )}
                  {availableCrmPlayers.length === 0 && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-gray-700">
                      No unlinked CRM players found for this parent.
                    </div>
                  )}
                </>
              )}
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
                disabled={!selectedParentId || !selectedCrmPlayerId}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Add player from CRM
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
