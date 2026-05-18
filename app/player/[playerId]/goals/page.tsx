import { Target } from "lucide-react";
import { PlayerPeriodGoals } from "@/app/player/[playerId]/ui/PlayerPeriodGoals";

export default async function PlayerGoalsPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await props.params;

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 border-b border-gray-100 pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <Target className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Goals</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Weekly focus areas and steps set by your coach.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="text-sm font-semibold text-emerald-800">
          Goals aren't just checkboxes — they're your roadmap to becoming a better player.
        </p>
        <p className="mt-2 text-sm text-emerald-700 leading-relaxed">
          Real development doesn't happen by accident. It happens when you show up with a
          plan — at home, away from team practice, between sessions — and deliberately work
          on the specific things that need fixing. That's what separates good players from
          great ones.
        </p>
        <p className="mt-2 text-sm text-emerald-700 leading-relaxed">
          After each private session, Coach David will set the steps you need to focus on
          that week. Some goals take a week. Some take longer. But if you follow the steps
          and put in the work every day, you will see real improvement in your weak spots.
          Not someday — soon.
        </p>
        <p className="mt-2 text-sm font-medium text-emerald-800">
          Trust the process, do the reps, hit the goal.
        </p>
      </div>

      <PlayerPeriodGoals playerId={playerId} />
    </div>
  );
}
