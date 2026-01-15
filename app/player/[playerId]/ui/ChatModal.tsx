"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, RefreshCw, Trash2, Send } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  sequence_number: number;
};

type ChatModalProps = {
  playerId: string;
  playerName: string;
  isOpen: boolean;
  onClose: () => void;
};

export function ChatModal({
  playerId,
  playerName,
  isOpen,
  onClose,
}: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversation on mount
  useEffect(() => {
    if (isOpen) {
      loadConversation();
      // Focus input after a brief delay
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, playerId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isStreaming) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isStreaming, onClose]);

  async function loadConversation() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${playerId}/chat/conversation`);
      if (!res.ok) throw new Error("Failed to load conversation");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setIsLoading(false);
    }
  }

  async function sendMessage() {
    const message = inputValue.trim();
    if (!message || isStreaming) return;

    // Add user message optimistically
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
      sequence_number: messages.length,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsStreaming(true);
    setError(null);

    try {
      const res = await fetch(`/api/players/${playerId}/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      // Process streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let assistantMsgId: string | null = null;

      // Read stream
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              // Handle Responses API event format
              if (parsed.type === "response.output_text.delta" && parsed.delta) {
                accumulatedContent += parsed.delta;

                // Create assistant message on first delta
                if (!assistantMsgId) {
                  assistantMsgId = `assistant-${Date.now()}`;
                  const assistantMsg: Message = {
                    id: assistantMsgId,
                    role: "assistant",
                    content: accumulatedContent,
                    created_at: new Date().toISOString(),
                    sequence_number: messages.length + 1,
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                } else {
                  // Update existing message content
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: accumulatedContent }
                        : m
                    )
                  );
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Reload conversation to get final saved messages with correct IDs
      await loadConversation();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
      // Remove optimistic messages on error
      setMessages((prev) =>
        prev.filter(
          (m) => !m.id.startsWith("temp-") && !m.id.startsWith("assistant-")
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleRefresh() {
    if (isStreaming) return;

    startTransition(async () => {
      try {
        const message =
          "Can you refresh your understanding of my player's current data?";
        setInputValue("");

        // Add user message optimistically
        const userMsg: Message = {
          id: `temp-${Date.now()}`,
          role: "user",
          content: message,
          created_at: new Date().toISOString(),
          sequence_number: messages.length,
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsStreaming(true);
        setError(null);

        const res = await fetch(`/api/players/${playerId}/chat/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, refreshContext: true }),
        });

        if (!res.ok) throw new Error("Failed to refresh context");

        // Process streaming response
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";
        let assistantMsgId: string | null = null;

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);

                // Handle Responses API event format
                if (parsed.type === "response.output_text.delta" && parsed.delta) {
                  accumulatedContent += parsed.delta;

                  // Create assistant message on first delta
                  if (!assistantMsgId) {
                    assistantMsgId = `assistant-${Date.now()}`;
                    const assistantMsg: Message = {
                      id: assistantMsgId,
                      role: "assistant",
                      content: accumulatedContent,
                      created_at: new Date().toISOString(),
                      sequence_number: messages.length + 1,
                    };
                    setMessages((prev) => [...prev, assistantMsg]);
                  } else {
                    // Update existing message content
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: accumulatedContent }
                          : m
                      )
                    );
                  }
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        await loadConversation();
      } catch (e) {
        setError("Failed to refresh context");
      } finally {
        setIsStreaming(false);
      }
    });
  }

  async function handleReset() {
    if (!confirm("Delete entire chat history? This cannot be undone.")) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/players/${playerId}/chat/conversation`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to reset chat");
        setMessages([]);
      } catch (e) {
        setError("Failed to reset chat");
      }
    });
  }

  if (!isOpen) return null;

  // Filter out system messages from display
  const displayMessages = messages.filter((m) => m.role !== "system");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isStreaming) {
          onClose();
        }
      }}
    >
      <div className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-emerald-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-6 py-4 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Chat about {playerName}&apos;s Development
            </h2>
            <p className="mt-0.5 text-sm text-gray-600">
              Ask about progress, goals, and training insights
            </p>
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs text-amber-800">
                <strong>Beta:</strong> AI can make mistakes. Always verify important details.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={isPending || isStreaming}
              className="rounded-xl border border-red-200 bg-white p-2 text-red-700 transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear conversation and start fresh"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              disabled={isStreaming}
              className="rounded-xl border border-gray-200 bg-white p-2 text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-gray-600">
                Loading conversation...
              </div>
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-sm text-gray-600 mb-4">
                No messages yet. Start by asking a question about{" "}
                {playerName}&apos;s development!
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Try: &quot;How is {playerName} progressing?&quot;</div>
                <div>Try: &quot;What should we focus on next?&quot;</div>
                <div>Try: &quot;Explain the latest test results&quot;</div>
              </div>
            </div>
          ) : (
            displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {msg.content}
                  </div>
                  <div
                    className={`mt-1 text-xs ${
                      msg.role === "user" ? "text-emerald-100" : "text-gray-500"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing indicator - only show when streaming and no assistant message is being built yet */}
          {isStreaming && !displayMessages.some(m => m.role === "assistant" && m.id.startsWith("assistant-")) && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-3">
                <div className="flex space-x-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-emerald-100 bg-emerald-50 p-4 rounded-b-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Ask about ${playerName}'s development...`}
              disabled={isStreaming}
              className="flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isStreaming}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
