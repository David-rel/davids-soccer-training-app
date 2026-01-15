import { openai, CHAT_MODEL } from "@/lib/openai";
import { sql } from "@/db";
import { buildSystemPrompt, PlayerContextData } from "@/lib/chat-context";

type StreamOptions = {
  conversationId: string;
  userMessage: string;
  contextData: PlayerContextData | null;
  lastResponseId: string | null;
  nextSequence: number;
  playerId: string;
};

export async function streamOpenAIResponse(options: StreamOptions) {
  const {
    conversationId,
    userMessage,
    contextData,
    lastResponseId,
    nextSequence,
  } = options;

  // Build params for Responses API
  // IMPORTANT: We need to send instructions (player context) on EVERY message
  // Even though OpenAI Responses API has store:true and previous_response_id,
  // the detailed player data (test scores, metrics) is not being preserved reliably
  // So we send the full context every time to ensure the AI always has access to all data
  const instructions = contextData ? buildSystemPrompt(contextData) : undefined;

  // Debug logging
  console.log("[OpenAI Chat] Creating response with:", {
    hasInstructions: !!instructions,
    previousResponseId: lastResponseId,
    userMessage: userMessage.substring(0, 50) + "...",
  });

  if (instructions) {
    console.log("[OpenAI Chat] Instructions length:", instructions.length);
    console.log("[OpenAI Chat] Instructions preview:", instructions.substring(0, 500) + "...");
  }

  // Create streaming response using Responses API
  // According to OpenAI docs: when using previous_response_id, context is automatically preserved
  // So we only send instructions on the very first message
  const stream = await openai.responses.create({
    model: CHAT_MODEL,
    input: userMessage, // Just the user message text
    instructions: instructions, // Only sent on first message
    previous_response_id: lastResponseId || undefined,
    store: true, // Store conversation state on OpenAI's servers
    stream: true,
  });

  // Create a TransformStream to process the streaming data from Responses API
  const encoder = new TextEncoder();
  let fullContent = "";
  let responseId: string | null = null;

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      // Forward chunk to client in SSE format
      const text = JSON.stringify(chunk);
      controller.enqueue(encoder.encode(`data: ${text}\n\n`));

      // Accumulate response data from Responses API events
      // Event types: response.created, response.output_text.delta, response.completed

      // Extract response ID from response.created event
      if (chunk.type === "response.created" && chunk.response?.id) {
        responseId = chunk.response.id;
        console.log("[OpenAI Chat] Got response ID:", responseId);
      }

      // Handle text delta events
      if (chunk.type === "response.output_text.delta" && chunk.delta) {
        fullContent += chunk.delta;
      }
    },

    async flush() {
      // Send done signal
      const doneChunk = encoder.encode("data: [DONE]\n\n");

      // Save assistant message to database
      if (fullContent) {
        await sql`
          INSERT INTO player_chat_messages
            (conversation_id, role, content, sequence_number, openai_response_id)
          VALUES
            (${conversationId}, 'assistant', ${fullContent}, ${nextSequence}, ${responseId})
        `;

        // Update conversation with latest response ID
        console.log("[OpenAI Chat] Saving response ID to DB:", responseId);
        await sql`
          UPDATE player_conversations
          SET
            last_response_id = ${responseId},
            last_message_at = now(),
            updated_at = now()
          WHERE id = ${conversationId}
        `;
      }
    },
  });

  // Convert async iterable to ReadableStream
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  // Return streaming response
  return new Response(readableStream.pipeThrough(transformStream), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
