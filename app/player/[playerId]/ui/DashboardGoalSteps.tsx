"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

type Step = {
  id: string;
  period_goal_id: string;
  title: string;
  completed: boolean;
  target_date: string | null;
};

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayAbbr(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return DAY[new Date(y, m - 1, day).getDay()];
}

export function DashboardGoalSteps({
  playerId,
  goalId,
  initialSteps,
}: {
  playerId: string;
  goalId: string;
  initialSteps: Step[];
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [toggling, setToggling] = useState<string | null>(null);

  async function toggle(step: Step) {
    if (toggling) return;
    const next = !step.completed;
    setToggling(step.id);
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, completed: next } : s)));
    try {
      const res = await fetch(
        `/api/players/${playerId}/period-goals/${goalId}/steps/${step.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ completed: next }),
        },
      );
      if (!res.ok) throw new Error();
    } catch {
      setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, completed: step.completed } : s)));
    } finally {
      setToggling(null);
    }
  }

  const done = steps.filter((s) => s.completed).length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-emerald-200">
          <span>{done} of {steps.length} steps done</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => void toggle(step)}
            disabled={toggling === step.id}
            className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-white/10 disabled:opacity-60"
          >
            {step.completed
              ? <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
              : <Circle className="h-4 w-4 shrink-0 text-white/50 group-hover:text-white/80" />}
            <span className={`flex-1 text-sm ${step.completed ? "text-white/60 line-through" : "text-white"}`}>
              {step.title}
            </span>
            {step.target_date && (
              <span className="shrink-0 text-xs font-semibold text-white/50">
                {dayAbbr(step.target_date)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
