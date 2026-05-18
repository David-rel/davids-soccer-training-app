import { Upload } from "lucide-react";
import { ExtraHelpTabs } from "@/app/player/[playerId]/ui/ExtraHelpTabs";

export default async function PlayerUploadsPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await props.params;

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 border-b border-gray-100 pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
          <Upload className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Extra Help</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Everything you need to keep developing between sessions.
          </p>
        </div>
      </div>

      <ExtraHelpTabs playerId={playerId} />
    </div>
  );
}
