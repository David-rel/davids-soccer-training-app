-- 0010_player_chat.sql
-- AI chat conversations for player development insights

-- Conversations table: One conversation per player (singleton pattern)
CREATE TABLE IF NOT EXISTS player_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- OpenAI Responses API tracking
  openai_conversation_id TEXT,
  last_response_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,

  -- Ensure one conversation per player
  UNIQUE(player_id)
);

CREATE INDEX IF NOT EXISTS player_conversations_player_id_idx
  ON player_conversations(player_id);

-- Messages table: Chat history
CREATE TABLE IF NOT EXISTS player_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES player_conversations(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- OpenAI metadata
  openai_message_id TEXT,
  openai_response_id TEXT,

  -- Token tracking (for cost management)
  input_tokens INT,
  output_tokens INT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ordering
  sequence_number INT NOT NULL
);

CREATE INDEX IF NOT EXISTS player_chat_messages_conversation_id_idx
  ON player_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS player_chat_messages_conversation_id_seq_idx
  ON player_chat_messages(conversation_id, sequence_number);
CREATE INDEX IF NOT EXISTS player_chat_messages_created_at_idx
  ON player_chat_messages(created_at);

-- Context snapshots: Store player data sent to OpenAI for each conversation start
CREATE TABLE IF NOT EXISTS player_chat_context_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES player_conversations(id) ON DELETE CASCADE,

  -- Snapshot of player data at time of conversation start
  player_snapshot JSONB NOT NULL,
  metrics_snapshot JSONB,
  goals_snapshot JSONB,
  sessions_snapshot JSONB,
  tests_snapshot JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Track when context was last refreshed
  is_current BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS player_chat_context_snapshots_conversation_id_idx
  ON player_chat_context_snapshots(conversation_id);
CREATE INDEX IF NOT EXISTS player_chat_context_snapshots_is_current_idx
  ON player_chat_context_snapshots(conversation_id, is_current);
