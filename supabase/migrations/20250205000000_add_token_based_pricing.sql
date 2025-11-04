ALTER TABLE messages ADD COLUMN IF NOT EXISTS cost_usd numeric DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS model_used text;

CREATE TABLE IF NOT EXISTS token_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  message_id bigint REFERENCES messages(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('generation', 'improve_prompt')),
  model_used TEXT NOT NULL,
  input_tokens numeric NOT NULL DEFAULT 0,
  output_tokens numeric NOT NULL DEFAULT 0,
  cache_creation_input_tokens numeric NOT NULL DEFAULT 0,
  cache_read_input_tokens numeric NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_token_usage_tracking_user_id ON token_usage_tracking(user_id);
CREATE INDEX idx_token_usage_tracking_created_at ON token_usage_tracking(created_at);
CREATE INDEX idx_token_usage_tracking_usage_type ON token_usage_tracking(usage_type);

ALTER TABLE token_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token usage" ON token_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own token usage" ON token_usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE token_usage_tracking IS 'Tracks token usage and costs for accurate token-based pricing';
COMMENT ON COLUMN token_usage_tracking.usage_type IS 'Type of usage: generation (AI component generation) or improve_prompt (prompt enhancement)';
COMMENT ON COLUMN token_usage_tracking.cost_usd IS 'Actual cost in USD for this usage';
COMMENT ON COLUMN messages.cost_usd IS 'Cost in USD for this message generation';
COMMENT ON COLUMN messages.model_used IS 'AI model used for this generation';

