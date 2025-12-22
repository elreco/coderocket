ALTER TABLE chats ADD COLUMN IF NOT EXISTS active_stream_id TEXT DEFAULT NULL;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS active_stream_started_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_chats_active_stream_id ON chats(active_stream_id) WHERE active_stream_id IS NOT NULL;

COMMENT ON COLUMN chats.active_stream_id IS 'ID of the currently active resumable stream for this chat, used to resume streaming after page refresh';
COMMENT ON COLUMN chats.active_stream_started_at IS 'Timestamp when the active stream started, used to detect and cleanup stale streams';
