"use client";

import { MessageSquare } from "lucide-react";

type ChatButtonProps = {
  onClick: () => void;
};

export function ChatButton({ onClick }: ChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-200"
      aria-label="Chat about player development"
      title="Chat with my data"
    >
      <MessageSquare className="h-6 w-6" />
    </button>
  );
}
