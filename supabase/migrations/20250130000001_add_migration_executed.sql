ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS migrations_executed JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_migrations_executed 
ON public.messages USING GIN (migrations_executed);

COMMENT ON COLUMN public.messages.migrations_executed IS 'Array of executed migrations in JSONB format. Example: [{"name": "001_users.sql", "executed_at": "2025-01-30T10:00:00Z"}]';

