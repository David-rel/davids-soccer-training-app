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
};

type Player = {
  id: string;
  name: string;
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
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

function labelForParent(p: Parent) {
  return p.name ?? p.email ?? p.phone ?? p.id;
}

export default function AccountsClient() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [crmParents, setCrmParents] = useState<CrmParent[]>([]);
  const [crmPlayersForSelectedParent, setCrmPlayersForSelectedParent] = useState<CrmPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentSearch, setParentSearch] = useState("");

  // Create parent form
  const [selectedCrmParentId, setSelectedCrmParentId] = useState("");
  const [newParentName, setNewParentName] = useState("");
  const [newSecondaryParentName, setNewSecondaryParentName] = useState("");
  const [newParentEmail, setNewParentEmail] = useState("");
  const [newParentPhone, setNewParentPhone] = useState("");
  const [createParentNotice, setCreateParentNotice] = useState<string | null>(null);
  const [sendSms, setSendSms] = useState(true);
  const [creatingParent, setCreatingParent] = useState(false);

  // Create player form
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedCrmPlayerId, setSelectedCrmPlayerId] = useState("");
  const [newPlayerBirthdate, setNewPlayerBirthdate] = useState("");
  const [newPlayerTeamLevel, setNewPlayerTeamLevel] = useState("");
  const [newPlayerPrimaryPosition, setNewPlayerPrimaryPosition] = useState("");
  const [newPlayerSecondaryPosition, setNewPlayerSecondaryPosition] = useState("");
  const [creatingPlayer, setCreatingPlayer] = useState(false);

  const unlinkedCrmParents = useMemo(
    () => crmParents.filter((p) => !p.linked_app_parent_id),
    [crmParents]
  );

  const selectedCrmParent = useMemo(
    () => crmParents.find((p) => String(p.id) === selectedCrmParentId) ?? null,
    [crmParents, selectedCrmParentId]
  );

  const selectedParent = useMemo(
    () => parents.find((p) => p.id === selectedParentId) ?? null,
    [parents, selectedParentId]
  );

  const availableCrmPlayers = useMemo(
    () => crmPlayersForSelectedParent.filter((p) => !p.linked_app_player_id),
    [crmPlayersForSelectedParent]
  );

  const selectedCrmPlayer = useMemo(
    () => crmPlayersForSelectedParent.find((p) => String(p.id) === selectedCrmPlayerId) ?? null,
    [crmPlayersForSelectedParent, selectedCrmPlayerId]
  );

  const filteredParents = useMemo(() => {
    const q = parentSearch.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) =>
      [p.name, p.secondary_parent_name, p.email, p.phone, p.crm_parent_id ? String(p.crm_parent_id) : null]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [parents, parentSearch]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [parentData, crmData] = await Promise.all([
        api<{ parents: Parent[] }>("/api/admin/parents"),
        api<{ crmParents: CrmParent[] }>("/api/admin/crm/parents"),
      ]);
      setParents(parentData.parents ?? []);
      setCrmParents(crmData.crmParents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

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
    const crmParentId = selectedParent?.crm_parent_id;
    if (!crmParentId) {
      setCrmPlayersForSelectedParent([]);
      setSelectedCrmPlayerId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await api<{ crmPlayers: CrmPlayer[] }>(`/api/admin/crm/parents/${crmParentId}/players`);
        if (cancelled) return;
        const players = data.crmPlayers ?? [];
        setCrmPlayersForSelectedParent(players);
        const first = players.find((p) => !p.linked_app_player_id);
        setSelectedCrmPlayerId(first ? String(first.id) : "");
      } catch {
        if (cancelled) return;
        setCrmPlayersForSelectedParent([]);
        setSelectedCrmPlayerId("");
      }
    })();
    return () => { cancelled = true; };
  }, [selectedParent?.crm_parent_id]);

  async function createParent() {
    if (!selectedCrmParentId) { setError("Select a CRM parent first."); return; }
    setError(null);
    setCreateParentNotice(null);
    setCreatingParent(true);
    try {
      const result = await api<{ parent: Parent; smsSent: boolean; smsError: string | null }>("/api/admin/parents", {
        method: "POST",
        body: JSON.stringify({
          crm_parent_id: selectedCrmParentId,
          name: newParentName || undefined,
          secondary_parent_name: newSecondaryParentName || undefined,
          email: newParentEmail || undefined,
          phone: newParentPhone || undefined,
          send_sms: sendSms,
        }),
      });
      setNewParentName("");
      setNewSecondaryParentName("");
      setNewParentEmail("");
      setNewParentPhone("");
      setSelectedCrmParentId("");
      if (result.smsSent) {
        setCreateParentNotice("Account created — setup link sent via SMS.");
      } else {
        setCreateParentNotice(`Account created — SMS failed: ${result.smsError ?? "unknown error"}`);
      }
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create parent.");
    } finally {
      setCreatingParent(false);
    }
  }

  async function createPlayer() {
    if (!selectedParentId) { setError("Select a parent first."); return; }
    if (!selectedParent?.crm_parent_id) { setError("Selected parent is not linked to a CRM parent."); return; }
    if (!selectedCrmPlayerId) { setError("Select a CRM player first."); return; }
    setError(null);
    setCreatingPlayer(true);
    try {
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
      // Re-fetch CRM players so the new one shows as linked
      const data = await api<{ crmPlayers: CrmPlayer[] }>(`/api/admin/crm/parents/${selectedParent.crm_parent_id}/players`);
      setCrmPlayersForSelectedParent(data.crmPlayers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create player.");
    } finally {
      setCreatingPlayer(false);
    }
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <header className="border-b border-emerald-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin</div>
            <h1 className="text-lg font-bold text-gray-900">Accounts</h1>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
          >
            ← Admin home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Two creation forms side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Add New Parent */}
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Add New Parent</h2>
            <p className="mt-0.5 text-sm text-gray-500">Link a CRM parent to create their account. A setup link will be texted to them so they can set their own password.</p>
            <div className="mt-4 space-y-3">
              <select
                value={selectedCrmParentId}
                onChange={(e) => setSelectedCrmParentId(e.target.value)}
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              >
                <option value="">Select CRM parent…</option>
                {unlinkedCrmParents.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} · {p.email ?? p.phone ?? "no contact"}
                  </option>
                ))}
              </select>

              {selectedCrmParent && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-gray-700 space-y-0.5">
                  <div className="font-semibold">{selectedCrmParent.name}</div>
                  <div>{selectedCrmParent.email ?? "No email"} · {selectedCrmParent.phone ?? "No phone"}</div>
                  {selectedCrmParent.secondary_parent_name && <div>Secondary: {selectedCrmParent.secondary_parent_name}</div>}
                </div>
              )}

              <input value={newParentName} onChange={(e) => setNewParentName(e.target.value)} placeholder="Parent name" className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              <input value={newSecondaryParentName} onChange={(e) => setNewSecondaryParentName(e.target.value)} placeholder="Second parent name (optional)" className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              <input value={newParentEmail} onChange={(e) => setNewParentEmail(e.target.value)} placeholder="Email (optional)" className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              <input value={newParentPhone} onChange={(e) => setNewParentPhone(e.target.value)} placeholder="Phone (required for SMS)" className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />

              {createParentNotice && (
                <p className="text-xs text-emerald-700 font-medium">{createParentNotice}</p>
              )}
              {unlinkedCrmParents.length === 0 && (
                <p className="text-xs text-gray-500">All CRM parents are already linked.</p>
              )}
              <button
                type="button"
                onClick={() => void createParent()}
                disabled={!selectedCrmParentId || creatingParent}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {creatingParent ? "Creating…" : "Create account & send setup link"}
              </button>
            </div>
          </section>

          {/* Add New Player */}
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Add New Player</h2>
            <p className="mt-0.5 text-sm text-gray-500">Link a CRM player to an existing parent account.</p>
            <div className="mt-4 space-y-3">
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              >
                <option value="">Select parent…</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>{labelForParent(p)}</option>
                ))}
              </select>

              {!selectedParent?.crm_parent_id ? (
                selectedParentId && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    This parent isn&apos;t linked to CRM — can&apos;t pull their players.
                  </div>
                )
              ) : (
                <>
                  <select
                    value={selectedCrmPlayerId}
                    onChange={(e) => setSelectedCrmPlayerId(e.target.value)}
                    className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  >
                    <option value="">Select CRM player…</option>
                    {availableCrmPlayers.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}{p.team ? ` (${p.team})` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedCrmPlayer && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-gray-700 space-y-0.5">
                      <div className="font-semibold">{selectedCrmPlayer.name}</div>
                      <div>Team: {selectedCrmPlayer.team ?? "—"} · Age: {selectedCrmPlayer.age ?? "—"}</div>
                    </div>
                  )}
                  {availableCrmPlayers.length === 0 && (
                    <p className="text-xs text-gray-500">No unlinked CRM players for this parent.</p>
                  )}
                </>
              )}

              <input type="date" value={newPlayerBirthdate} onChange={(e) => setNewPlayerBirthdate(e.target.value)} className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              <input value={newPlayerTeamLevel} onChange={(e) => setNewPlayerTeamLevel(e.target.value)} placeholder="Team / level" className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              <div className="grid grid-cols-2 gap-2">
                <input value={newPlayerPrimaryPosition} onChange={(e) => setNewPlayerPrimaryPosition(e.target.value)} placeholder="Primary position" className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                <input value={newPlayerSecondaryPosition} onChange={(e) => setNewPlayerSecondaryPosition(e.target.value)} placeholder="Secondary position" className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </div>
              <button
                type="button"
                onClick={() => void createPlayer()}
                disabled={!selectedParentId || !selectedCrmPlayerId || creatingPlayer}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {creatingPlayer ? "Creating…" : "Create player"}
              </button>
            </div>
          </section>
        </div>

        {/* Parents list */}
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-gray-900">
              All Parents{!loading && <span className="ml-2 text-sm font-normal text-gray-400">({parents.length})</span>}
            </h2>
            <button
              type="button"
              onClick={() => void loadAll()}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:border-emerald-300"
            >
              Refresh
            </button>
          </div>

          <input
            value={parentSearch}
            onChange={(e) => setParentSearch(e.target.value)}
            placeholder="Search by name, email, phone, CRM ID…"
            className="mb-4 w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          />

          {loading ? (
            <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
          ) : filteredParents.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              {parentSearch ? "No parents match your search." : "No parents yet."}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredParents.map((parent) => (
                <Link
                  key={parent.id}
                  href={`/admin/parent/${parent.id}`}
                  className="group rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <div className="text-sm font-semibold text-gray-900">{labelForParent(parent)}</div>
                  {parent.secondary_parent_name && (
                    <div className="mt-0.5 text-xs text-gray-500">+ {parent.secondary_parent_name}</div>
                  )}
                  <div className="mt-1 text-xs text-gray-400">
                    {parent.crm_parent_id ? `CRM ${parent.crm_parent_id}` : "No CRM link"} · Open profile →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
