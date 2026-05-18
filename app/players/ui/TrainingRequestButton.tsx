"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { TrainingRequestModal } from "./TrainingRequestModal";

type Props = {
  defaultParentName: string;
  defaultPlayerName: string;
  defaultPhone: string;
  defaultEmail: string;
  defaultLocation: string;
};

export function TrainingRequestButton(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
      >
        <CalendarDays className="h-4 w-4" />
        Request a Training Time
      </button>
      <TrainingRequestModal
        open={open}
        onClose={() => setOpen(false)}
        {...props}
      />
    </>
  );
}
