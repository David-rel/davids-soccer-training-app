"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlayerShopPanel from "@/app/components/player-shop-panel";

type PlayerPayload = {
  player: {
    id: string;
    name: string;
  };
};

export default function AdminPreviewShopClient(props: {
  params: Promise<{ playerId: string }>;
}) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    props.params.then(({ playerId: nextPlayerId }) => setPlayerId(nextPlayerId));
  }, [props.params]);

  useEffect(() => {
    if (!playerId) return;

    void (async () => {
      setError(null);
      const res = await fetch(`/api/admin/players/${playerId}`, { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "Failed to load player.");
        setError(text || "Failed to load player.");
        return;
      }
      const payload = (await res.json()) as PlayerPayload;
      setPlayerName(payload.player.name);
    })();
  }, [playerId]);

  if (!playerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50">
        <p className="text-sm text-gray-600">Loading player...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />

      <header className="relative bg-linear-to-r from-emerald-600 to-emerald-700">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-50">Admin Preview</p>
              <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                {playerName || "Player"} Shop Preview
              </h1>
              <p className="mt-2 text-sm text-emerald-100">
                Read-only mirror of the player shop and progression.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/player/${playerId}/preview`}
                className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Back to preview
              </Link>
              <Link
                href={`/admin/player/${playerId}`}
                className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Back to admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-12">
        <PlayerShopPanel
          playerId={playerId}
          playerName={playerName || "Player"}
          title="Progression + Rewards"
          subtitle="Admin read-only preview for this player."
          pointsEndpoint={`/api/admin/players/${playerId}/points/state`}
          shopEndpoint={`/api/admin/players/${playerId}/shop`}
          readOnly
        />
      </main>
    </div>
  );
}
