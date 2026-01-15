"use client";

import { useState } from "react";
import { ChatButton } from "./ChatButton";
import { ChatModal } from "./ChatModal";

type ChatWrapperProps = {
  playerId: string;
  playerName: string;
};

export function ChatWrapper({ playerId, playerName }: ChatWrapperProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <ChatButton onClick={() => setIsChatOpen(true)} />
      <ChatModal
        playerId={playerId}
        playerName={playerName}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </>
  );
}
