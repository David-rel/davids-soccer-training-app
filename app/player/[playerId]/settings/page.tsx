import { Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { sql } from "@/db";
import { PlayerEditor } from "@/app/player/[playerId]/ui/PlayerEditor";

type PlayerRow = {
  id: string;
  name: string;
  birthdate: string | null;
  team_level: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  dominant_foot: string | null;
  shirt_size: string | null;
  location: string | null;
  profile_photo_url: string | null;
};

export default async function PlayerSettingsPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const { playerId } = await props.params;
  const isAdmin = session.user.isAdmin === true;

  const rows = (await sql`
    SELECT
      id, name, birthdate::text AS birthdate, team_level,
      primary_position, secondary_position, dominant_foot,
      shirt_size, location, profile_photo_url
    FROM players
    WHERE id = ${playerId}
      AND (${isAdmin} OR parent_id = ${session.user.id})
    LIMIT 1
  `) as unknown as PlayerRow[];

  const player = rows[0];
  if (!player) redirect(isAdmin ? "/admin/players" : "/players");

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 border-b border-gray-100 pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Update your player&apos;s profile and basic info.
          </p>
        </div>
      </div>

      <PlayerEditor player={player} />
    </div>
  );
}
