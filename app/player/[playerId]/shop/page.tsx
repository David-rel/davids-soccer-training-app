import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/db";
import { SignOutButton } from "@/app/ui/SignOutButton";
import PlayerShopPanel from "@/app/components/player-shop-panel";

type PlayerRow = {
  id: string;
  parent_id: string;
  name: string;
};

export default async function PlayerShopPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const { playerId } = await props.params;
  const rows = (await sql`
    SELECT id, parent_id, name
    FROM players
    WHERE id = ${playerId}
      AND parent_id = ${session.user.id}
    LIMIT 1
  `) as unknown as PlayerRow[];

  const player = rows[0];
  if (!player) redirect("/players");

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />

      <header className="relative bg-linear-to-r from-emerald-600 to-emerald-700">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/icon.png"
                alt="David’s Soccer Training icon"
                width={56}
                height={56}
                className="h-14 w-14 rounded-2xl bg-white p-2"
                priority
              />
              <div>
                <div className="text-sm font-semibold text-emerald-50">
                  David’s Soccer Training
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {player.name} Shop
                </h1>
                <p className="mt-2 text-sm text-emerald-100 sm:text-base">
                  Player-specific rewards and progression.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/player/${player.id}`}
                className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Back to player
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-12">
        <PlayerShopPanel
          playerId={player.id}
          playerName={player.name}
          title="Progression + Rewards"
          subtitle="This shop is tied to this player only."
          pointsEndpoint={`/api/players/${player.id}/points/state`}
          shopEndpoint={`/api/players/${player.id}/shop`}
          purchaseEndpoint={`/api/players/${player.id}/shop/purchases`}
        />
      </main>
    </div>
  );
}
