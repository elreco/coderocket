-- Create table to track version usage for accurate pricing calculations
CREATE TABLE version_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('component')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_version_usage_tracking_user_id ON version_usage_tracking(user_id);
CREATE INDEX idx_version_usage_tracking_created_at ON version_usage_tracking(created_at);
CREATE INDEX idx_version_usage_tracking_usage_type ON version_usage_tracking(usage_type);

-- Add unique constraint to prevent duplicate tracking
CREATE UNIQUE INDEX idx_version_usage_tracking_unique ON version_usage_tracking(user_id, chat_id, version, usage_type);

-- Add RLS policies
ALTER TABLE version_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view their own usage tracking" ON version_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert their own usage tracking" ON version_usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE version_usage_tracking IS 'Tracks version usage for accurate pricing calculations';
COMMENT ON COLUMN version_usage_tracking.usage_type IS 'Type of usage: component (new AI requests and iterations)';
