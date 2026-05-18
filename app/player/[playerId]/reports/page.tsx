import { FileText } from "lucide-react";
import { PlayerCoachingReports } from "@/app/player/[playerId]/ui/PlayerCoachingReports";
import { PlayerSessions } from "@/app/player/[playerId]/ui/PlayerSessions";

export default async function PlayerReportsPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await props.params;

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 border-b border-gray-100 pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
          <FileText className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Feedback &amp; Reports</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Technical reports and notes from Coach David throughout your package.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-4">
        <p className="text-sm font-semibold text-purple-800">
          This is more than just session notes — it's a window into your development.
        </p>
        <p className="mt-2 text-sm text-purple-700 leading-relaxed">
          At the start of every package, Coach David will write an initial feedback report
          laying out where you are as a player right now — what's working, what needs
          attention, and what the focus will be. Depending on the length of your package,
          there will also be a technical report at the midpoint and/or at the end, so you
          can see real before-and-after development over time.
        </p>
        <p className="mt-2 text-sm text-purple-700 leading-relaxed">
          In between those reports, Coach David will drop shorter blurbs — quick notes on
          a breakthrough he noticed, a soccer IQ idea that applies to your game, or an
          update on something you've been working on. These aren't throwaway comments.
          Read them. They connect directly to your goals and the things you're trying to
          fix.
        </p>
        <p className="mt-2 text-sm font-medium text-purple-800">
          Use this tab to track where you started, how far you've come, and what's next.
        </p>
      </div>

      <PlayerCoachingReports playerId={playerId} />

      {/* Session notes — kept below coaching reports */}
      <div className="mt-8">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Session Notes
        </div>
        <PlayerSessions playerId={playerId} />
      </div>
    </div>
  );
}
