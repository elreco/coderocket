-- Create the extra_messages table to track purchased extra messages
CREATE TABLE extra_messages (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE extra_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own extra messages
CREATE POLICY "Users can view their own extra messages"
  ON extra_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Allow the service role to manage all extra messages
CREATE POLICY "Service role can manage all extra messages"
  ON extra_messages
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add the table to the publication for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE extra_messages;