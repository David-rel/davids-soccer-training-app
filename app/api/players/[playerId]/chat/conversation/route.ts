import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";

type ConversationRow = {
  id: string;
  player_id: string;
  last_response_id: string | null;
  last_message_at: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  sequence_number: number;
  input_tokens: number | null;
  output_tokens: number | null;
};

async function assertOwnsPlayer(req: NextRequest, playerId: string) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
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

// GET: Retrieve or create conversation
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  // Get or create conversation
  let rows = (await sql`
    SELECT id, player_id, last_response_id, last_message_at::text as last_message_at, created_at::text as created_at
    FROM player_conversations
    WHERE player_id = ${playerId}
    LIMIT 1
  `) as unknown as ConversationRow[];

  let conversation = rows[0];

  // Create if doesn't exist
  if (!conversation) {
    rows = (await sql`
      INSERT INTO player_conversations (player_id)
      VALUES (${playerId})
      RETURNING id, player_id, last_response_id, last_message_at::text as last_message_at, created_at::text as created_at
    `) as unknown as ConversationRow[];
    conversation = rows[0];
  }

  // Get message history
  const messages = (await sql`
    SELECT
      id, role, content, created_at::text as created_at, sequence_number,
      input_tokens, output_tokens
    FROM player_chat_messages
    WHERE conversation_id = ${conversation.id}
    ORDER BY sequence_number ASC
    LIMIT 1000
  `) as unknown as MessageRow[];

  return Response.json({ conversation, messages });
}

// DELETE: Reset conversation
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  // Delete conversation and all associated data (cascade will handle messages)
  await sql`
    DELETE FROM player_conversations
    WHERE player_id = ${playerId}
  `;

  return Response.json({ ok: true });
}
