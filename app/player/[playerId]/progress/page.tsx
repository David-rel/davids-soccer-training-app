import { BarChart2 } from "lucide-react";
import { PlayerInsights } from "@/app/player/[playerId]/ui/PlayerInsights";

export default async function PlayerProgressPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await props.params;

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 border-b border-gray-100 pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <BarChart2 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Progress</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Test results and progressions tracked over time.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-semibold text-blue-800">
          Your numbers tell part of the story — but only part of it.
        </p>
        <p className="mt-2 text-sm text-blue-700 leading-relaxed">
          Tests are run at the start of every package to establish a baseline. Depending
          on the length of your package, they'll be run again at the halfway point, and
          there will always be a final test day at the end. That progression — start,
          middle, end — is how we measure real improvement across different parts of
          your game.
        </p>
        <p className="mt-2 text-sm text-blue-700 leading-relaxed">
          Don't panic if a number goes down or barely moves. Test results are objective,
          but they're also sensitive — if you're having an off day, tired, or just not
          feeling it, that can show up in the data. It doesn't mean you haven't improved.
          Some of the most important growth won't show up in a speed drill or a juggling
          count at all.
        </p>
        <p className="mt-2 text-sm text-blue-700 leading-relaxed">
          This is why tests are only one piece. Always look at your Feedback &amp; Reports
          alongside the numbers — Coach David's observations will often show progress that
          a stopwatch can't measure.
        </p>
        <p className="mt-2 text-sm font-medium text-blue-800">
          Use this data as a motivator, not a verdict.
        </p>
      </div>

      <PlayerInsights playerId={playerId} />
    </div>
  );
}
