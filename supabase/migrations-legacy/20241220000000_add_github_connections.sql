-- Create github_connections table
CREATE TABLE github_connections (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  github_username TEXT NOT NULL,
  access_token TEXT NOT NULL, -- Will be encrypted in production
  refresh_token TEXT, -- GitHub doesn't provide refresh tokens for OAuth apps, but keeping for future
  connected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_sync_at TIMESTAMPTZ,
  UNIQUE(user_id) -- One GitHub connection per user
);

-- Enable RLS for github_connections
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own GitHub connections
CREATE POLICY "Users can view own github connections" ON github_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only update their own GitHub connections
CREATE POLICY "Users can update own github connections" ON github_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only insert their own GitHub connections
CREATE POLICY "Users can insert own github connections" ON github_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own GitHub connections
CREATE POLICY "Users can delete own github connections" ON github_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Add GitHub sync columns to chats table
ALTER TABLE chats ADD COLUMN github_repo_url TEXT;
ALTER TABLE chats ADD COLUMN github_repo_name TEXT;
ALTER TABLE chats ADD COLUMN last_github_sync TIMESTAMPTZ;
ALTER TABLE chats ADD COLUMN github_sync_enabled BOOLEAN DEFAULT FALSE;