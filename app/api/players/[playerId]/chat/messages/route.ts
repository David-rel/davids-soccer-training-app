import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";
import { streamOpenAIResponse } from "@/lib/openai-chat";
import { preparePlayerContext } from "@/lib/chat-context";

type ConversationRow = {
  id: string;
  player_id: string;
  last_response_id: string | null;
  last_message_at: string | null;
  created_at: string;
};

async function assertOwnsPlayer(req: NextRequest, playerId: string) {
  const token = await getToken({ req });
  const parentId = token?.sub;
  if (!parentId) {
    return {
      ok: false as const,
      res: new Response("Unauthorized", { status: 401 }),
    };
  }

  const owns = await sql`
    SELECT 1
    FROM players
    WHERE id = ${playerId} AND parent_id = ${parentId}
    LIMIT 1
  `;

  if (owns.length === 0) {
    return {
      ok: false as const,
      res: new Response("Not found", { status: 404 }),
    };
  }
  return { ok: true as const, parentId };
}

async function getOrCreateConversation(
  playerId: string
): Promise<ConversationRow> {
  let rows = (await sql`
    SELECT id, player_id, last_response_id, last_message_at::text as last_message_at, created_at::text as created_at
    FROM player_conversations
    WHERE player_id = ${playerId}
    LIMIT 1
  `) as unknown as ConversationRow[];

  if (rows[0]) return rows[0];

  // Create new conversation
  rows = (await sql`
    INSERT INTO player_conversations (player_id)
    VALUES (${playerId})
    RETURNING id, player_id, last_response_id, last_message_at::text as last_message_at, created_at::text as created_at
  `) as unknown as ConversationRow[];

  return rows[0];
}

async function hasCurrentContext(conversationId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM player_chat_context_snapshots
    WHERE conversation_id = ${conversationId} AND is_current = true
    LIMIT 1
  `;
  return rows.length > 0;
}

async function saveContextSnapshot(
  conversationId: string,
  contextData: Awaited<ReturnType<typeof preparePlayerContext>>
) {
  // Mark existing contexts as not current
  await sql`
    UPDATE player_chat_context_snapshots
    SET is_current = false
    WHERE conversation_id = ${conversationId}
  `;

  // Save new context snapshot
  await sql`
    INSERT INTO player_chat_context_snapshots
      (conversation_id, player_snapshot, metrics_snapshot, goals_snapshot, sessions_snapshot, tests_snapshot, is_current)
    VALUES
      (${conversationId},
       ${JSON.stringify(contextData.player)},
       ${JSON.stringify(contextData.latestMetrics)},
       ${JSON.stringify(contextData.goals)},
       ${JSON.stringify(contextData.recentSessions)},
       ${JSON.stringify(contextData.testHistory)},
       true)
  `;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  const body = (await req.json().catch(() => null)) as {
    message?: string;
    refreshContext?: boolean;
  } | null;
  const userMessage = String(body?.message ?? "").trim();

  if (!userMessage) {
    return new Response("Message is required", { status: 400 });
  }

  // Get or create conversation
  const conversation = await getOrCreateConversation(playerId);

  // ALWAYS fetch fresh player context for every message
  // This ensures the AI always has the latest test scores, goals, sessions, etc.
  const contextData = await preparePlayerContext(playerId);

  // Save context snapshot for record keeping
  await saveContextSnapshot(conversation.id, contextData);

  // Get next sequence number
  const seqRows = (await sql`
    SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
    FROM player_chat_messages
    WHERE conversation_id = ${conversation.id}
  `) as unknown as Array<{ next_seq: number }>;
  const nextSeq = seqRows[0].next_seq;

  // Save user message
  await sql`
    INSERT INTO player_chat_messages
      (conversation_id, role, content, sequence_number)
    VALUES (${conversation.id}, 'user', ${userMessage}, ${nextSeq})
  `;

  // Stream response from OpenAI
  // Always pass contextData so instructions are sent with every request
  return streamOpenAIResponse({
    conversationId: conversation.id,
    userMessage,
    contextData: contextData,
    lastResponseId: conversation.last_response_id,
    nextSequence: nextSeq + 1,
    playerId,
  });
}
