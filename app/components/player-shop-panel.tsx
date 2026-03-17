"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { PointsStateView, ShopItemView } from "@/lib/points/types";
import {
  formatTitleWithOptionalShirt,
  formatUnlockLabelForShirt,
  getShirtRankForDisplay,
} from "@/lib/points/display";

type PurchaseErrorPayload = {
  error?: string;
  reason?: string;
};

type PurchaseSuccessPayload = {
  itemName: string;
  creditsSpent: number;
  creditsRemaining: number;
};

type Props = {
  playerId: string;
  playerName: string;
  title: string;
  subtitle: string;
  pointsEndpoint: string;
  shopEndpoint: string;
  purchaseEndpoint?: string;
  readOnly?: boolean;
};

export default function PlayerShopPanel(props: Props) {
  const [points, setPoints] = useState<PointsStateView | null>(null);
  const [items, setItems] = useState<ShopItemView[]>([]);
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const isReadOnly = props.readOnly ?? false;

  const groupedByUnlock = useMemo(() => {
    const groups = new Map<string, ShopItemView[]>();

    for (const item of items) {
      const current = groups.get(item.unlockShirt) ?? [];
      current.push(item);
      groups.set(item.unlockShirt, current);
    }

    return [...groups.entries()].sort((a, b) => {
      return getShirtRankForDisplay(a[0]) - getShirtRankForDisplay(b[0]);
    });
  }, [items]);

  const fetchData = useCallback(async () => {
    const [pointsRes, shopRes] = await Promise.all([
      fetch(props.pointsEndpoint, { cache: "no-store" }),
      fetch(props.shopEndpoint, { cache: "no-store" }),
    ]);

    if (!pointsRes.ok || !shopRes.ok) {
      throw new Error("Failed to load points and shop data.");
    }

    const pointsPayload = (await pointsRes.json()) as PointsStateView;
    const shopPayload = (await shopRes.json()) as { items: ShopItemView[] };
    return { pointsPayload, items: shopPayload.items };
  }, [props.pointsEndpoint, props.shopEndpoint]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await fetchData();
        if (!active) return;
        setPoints(data.pointsPayload);
        setItems(data.items);
      } catch {
        if (!active) return;
        setMessage("Failed to load points and shop data.");
      }
    })();

    return () => {
      active = false;
    };
  }, [fetchData, props.playerId]);

  function buyItem(itemId: number) {
    if (!props.purchaseEndpoint || isReadOnly) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(props.purchaseEndpoint!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as PurchaseErrorPayload;
        setMessage(payload.error ?? "Purchase failed.");
        try {
          const data = await fetchData();
          setPoints(data.pointsPayload);
          setItems(data.items);
        } catch {
          setMessage(payload.error ?? "Purchase failed.");
        }
        return;
      }

      const payload = (await response.json()) as PurchaseSuccessPayload;
      setMessage(
        `Purchased ${payload.itemName} for ${payload.creditsSpent} credits. Remaining: ${payload.creditsRemaining}.`,
      );
      try {
        const data = await fetchData();
        setPoints(data.pointsPayload);
        setItems(data.items);
      } catch {
        setMessage("Purchase succeeded, but refresh failed.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">{props.title}</h2>
        <p className="mt-2 text-sm text-gray-600">{props.subtitle}</p>

        {points ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Title"
              value={formatTitleWithOptionalShirt({
                titleLevel: points.titleLevel,
                shirtLevel: points.shirtLevel,
              })}
            />
            <Metric label="XP" value={String(points.trainingXp)} />
            <Metric label="Credits" value={String(points.credits)} />
            <Metric
              label="Weekly Remaining"
              value={`${points.weeklyNonSessionRemaining}/${points.weeklyNonSessionCap}`}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">Loading progression...</p>
        )}
      </section>

      <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900">Shop</h3>
        <p className="mt-2 text-sm text-gray-600">
          Rewards are tied to each player&apos;s progression. Locked items stay visible and grayed out.
        </p>

        <div className="mt-5 space-y-6">
          {groupedByUnlock.map(([unlockShirt, groupItems]) => {
            return (
            <div key={unlockShirt}>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Unlocks at {formatUnlockLabelForShirt(unlockShirt)}
              </h4>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {groupItems.map((item) => {
                  const playerShirtRank = getShirtRankForDisplay(points?.shirtLevel);
                  const unlockRank = getShirtRankForDisplay(item.unlockShirt);
                  const isFutureLocked = points ? unlockRank > playerShirtRank + 1 : false;
                  const isLocked = item.status === "locked";
                  const isCapReached = item.status === "cap_reached";
                  const lockReason =
                    item.status === "locked"
                      ? `Unlocks at ${formatUnlockLabelForShirt(item.unlockShirt)}.`
                      : item.statusReason;

                  if (isFutureLocked) {
                    return (
                      <article
                        key={item.id}
                        className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 p-4 opacity-80 grayscale"
                      >
                        <div className="space-y-2 blur-[3px] select-none">
                          <p className="h-4 w-36 rounded bg-gray-300" />
                          <p className="h-3 w-24 rounded bg-gray-300" />
                          <p className="h-3 w-full rounded bg-gray-300" />
                          <p className="h-3 w-3/4 rounded bg-gray-300" />
                          <p className="h-3 w-1/2 rounded bg-gray-300" />
                          <p className="h-3 w-5/6 rounded bg-gray-300" />
                          <div className="mt-4 h-8 w-full rounded-xl bg-gray-300" />
                        </div>
                      </article>
                    );
                  }

                  return (
                    <article
                      key={item.id}
                      className={`rounded-2xl border p-4 transition ${
                        isLocked
                          ? "border-gray-200 bg-gray-50 opacity-70 grayscale"
                          : "border-emerald-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.category} • {item.rarity} • {item.itemType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-700">{item.effectivePrice} Cr</p>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-gray-600">{item.description}</p>

                      <p className="mt-2 text-xs text-gray-500">
                        {item.itemType === "discount"
                          ? `Monthly: ${item.usedThisMonth}/${item.monthlyCap ?? 0}`
                          : item.effectiveRepeatLimit !== null
                            ? `Lifetime: ${item.usedLifetime}/${item.effectiveRepeatLimit}`
                            : `Used lifetime: ${item.usedLifetime}`}
                      </p>

                      {lockReason ? (
                        <p className="mt-2 text-xs text-gray-500">{lockReason}</p>
                      ) : null}

                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold uppercase tracking-wide ${
                            item.status === "available" ? "text-emerald-700" : "text-gray-500"
                          }`}
                        >
                          {item.status === "available"
                            ? "Available"
                            : isCapReached
                              ? "Cap reached"
                              : "Locked"}
                        </span>
                        <button
                          type="button"
                          className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => buyItem(item.id)}
                          disabled={isPending || isReadOnly || item.status !== "available"}
                        >
                          {isReadOnly ? "Read only" : "Buy"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>

        <p className={`mt-5 text-sm ${message.toLowerCase().includes("failed") ? "text-red-700" : "text-emerald-700"}`}>
          {message || (isReadOnly ? "Preview mode." : "No purchases yet.")}
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-600">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
