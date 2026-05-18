"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";

type GoalStep = {
  id: string;
  period_goal_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
};

type PeriodGoal = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  steps: GoalStep[];
};

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayAbbr(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAY_ABBR[new Date(y, m - 1, d).getDay()];
}

function formatDateRange(start: string, end: string) {
  const fmt = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

function classifyGoal(goal: PeriodGoal): "active" | "upcoming" | "past" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [sy, sm, sd] = goal.start_date.split("-").map(Number);
  const [ey, em, ed] = goal.end_date.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (today < start) return "upcoming";
  if (today > end) return "past";
  return "active";
}

function ProgressBar({ total, done }: { total: number; done: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
        <span>
          {done} / {total} steps complete
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StepRow({
  step,
  onToggle,
  toggling,
}: {
  step: GoalStep;
  onToggle: (step: GoalStep) => void;
  toggling: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(step)}
      disabled={toggling}
      className="group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/60 disabled:opacity-60"
    >
      {step.completed ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 group-hover:text-emerald-400" />
      )}
      <div className="min-w-0 flex-1">
        <span
          className={`text-sm font-medium leading-snug ${
            step.completed ? "text-gray-400 line-through" : "text-gray-800"
          }`}
        >
          {step.title}
        </span>
        {step.description && (
          <p className="mt-0.5 text-xs text-gray-400">{step.description}</p>
        )}
      </div>
      {step.target_date && (
        <span className="shrink-0 text-xs font-semibold text-gray-400">
          {dayAbbr(step.target_date)}
        </span>
      )}
    </button>
  );
}

function ActiveGoalCard({
  goal,
  onToggleStep,
  togglingStepId,
}: {
  goal: PeriodGoal;
  onToggleStep: (step: GoalStep) => void;
  togglingStepId: string | null;
}) {
  const done = goal.steps.filter((s) => s.completed).length;

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-emerald-400 bg-emerald-50 shadow-md">
      {/* Header */}
      <div className="border-b border-emerald-200 bg-emerald-600 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            This Week
          </span>
        </div>
        <h3 className="mt-2 text-lg font-bold text-white">{goal.title}</h3>
        {goal.description && (
          <p className="mt-1 text-sm text-emerald-100">{goal.description}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-200">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDateRange(goal.start_date, goal.end_date)}
        </div>
      </div>

      {/* Progress + Steps */}
      <div className="px-5 py-4">
        <ProgressBar total={goal.steps.length} done={done} />

        {goal.steps.length > 0 ? (
          <div className="mt-3 divide-y divide-emerald-100">
            {goal.steps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                onToggle={onToggleStep}
                toggling={togglingStepId === step.id}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-emerald-600">
            No steps added yet — check back soon.
          </p>
        )}
      </div>
    </div>
  );
}

function UpcomingGoalCard({ goal }: { goal: PeriodGoal }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
      <div className="px-5 py-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Upcoming
        </span>
        <h3 className="mt-1 text-base font-semibold text-gray-600">{goal.title}</h3>
        {goal.description && (
          <p className="mt-0.5 text-sm text-gray-400">{goal.description}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDateRange(goal.start_date, goal.end_date)}
        </div>
        {goal.steps.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            {goal.steps.length} step{goal.steps.length !== 1 ? "s" : ""} planned
          </p>
        )}
      </div>
    </div>
  );
}

function PastGoalCard({
  goal,
  onToggleStep,
  togglingStepId,
}: {
  goal: PeriodGoal;
  onToggleStep: (step: GoalStep) => void;
  togglingStepId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = goal.steps.filter((s) => s.completed).length;
  const total = goal.steps.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-gray-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">{goal.title}</span>
            <span className="text-xs text-gray-400">
              {formatDateRange(goal.start_date, goal.end_date)}
            </span>
          </div>
          {total > 0 && (
            <span
              className={`mt-0.5 text-xs font-medium ${
                done === total ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              {done === total ? "✓ " : ""}
              {done}/{total} steps
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="ml-3 h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-4 pt-2">
          {goal.description && (
            <p className="mb-2 text-sm text-gray-500">{goal.description}</p>
          )}
          {goal.steps.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {goal.steps.map((step) => (
                <StepRow
                  key={step.id}
                  step={step}
                  onToggle={onToggleStep}
                  toggling={togglingStepId === step.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No steps recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-1">
      <div className="h-6 w-0.5 bg-gray-200" />
    </div>
  );
}

export function PlayerPeriodGoals({ playerId }: { playerId: string }) {
  const [goals, setGoals] = useState<PeriodGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingStepId, setTogglingStepId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/players/${playerId}/period-goals`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data: { goals: PeriodGoal[] }) => setGoals(data.goals))
      .catch(() => setError("Failed to load goals."))
      .finally(() => setLoading(false));
  }, [playerId]);

  const handleToggleStep = useCallback(
    async (step: GoalStep) => {
      if (togglingStepId) return;
      setTogglingStepId(step.id);

      const newCompleted = !step.completed;

      // Optimistic update
      setGoals((prev) =>
        prev.map((g) =>
          g.id !== step.period_goal_id
            ? g
            : {
                ...g,
                steps: g.steps.map((s) =>
                  s.id !== step.id ? s : { ...s, completed: newCompleted },
                ),
              },
        ),
      );

      try {
        const res = await fetch(
          `/api/players/${playerId}/period-goals/${step.period_goal_id}/steps/${step.id}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ completed: newCompleted }),
          },
        );
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { step: GoalStep };
        setGoals((prev) =>
          prev.map((g) =>
            g.id !== step.period_goal_id
              ? g
              : {
                  ...g,
                  steps: g.steps.map((s) =>
                    s.id !== step.id ? s : data.step,
                  ),
                },
          ),
        );
      } catch {
        // Revert on failure
        setGoals((prev) =>
          prev.map((g) =>
            g.id !== step.period_goal_id
              ? g
              : {
                  ...g,
                  steps: g.steps.map((s) =>
                    s.id !== step.id ? s : { ...s, completed: step.completed },
                  ),
                },
          ),
        );
      } finally {
        setTogglingStepId(null);
      }
    },
    [playerId, togglingStepId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Loading goals…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
        <div className="text-4xl">🎯</div>
        <p className="mt-3 text-sm font-medium text-gray-600">No goals set yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Check back after your next session — Coach David will set your goals.
        </p>
      </div>
    );
  }

  const upcoming = goals.filter((g) => classifyGoal(g) === "upcoming").reverse();
  const active = goals.filter((g) => classifyGoal(g) === "active");
  const past = goals.filter((g) => classifyGoal(g) === "past");

  const sections: Array<{ key: string; node: React.ReactNode }> = [];

  for (const goal of active) {
    sections.push({
      key: `a-${goal.id}`,
      node: (
        <ActiveGoalCard
          goal={goal}
          onToggleStep={handleToggleStep}
          togglingStepId={togglingStepId}
        />
      ),
    });
  }

  for (const goal of upcoming) {
    sections.push({ key: `u-${goal.id}`, node: <UpcomingGoalCard goal={goal} /> });
  }

  if (past.length > 0) {
    sections.push({
      key: "past-header",
      node: (
        <div className="px-1 pt-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Past goals
          </span>
        </div>
      ),
    });
    for (const goal of past) {
      sections.push({
        key: `p-${goal.id}`,
        node: (
          <PastGoalCard
            goal={goal}
            onToggleStep={handleToggleStep}
            togglingStepId={togglingStepId}
          />
        ),
      });
    }
  }

  return (
    <div className="flex flex-col">
      {sections.map((s, i) => (
        <div key={s.key}>
          {i > 0 && !String(s.key).startsWith("past-header") && <Connector />}
          {s.node}
        </div>
      ))}
    </div>
  );
}
