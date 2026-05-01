-- Add is_github_pull column to messages table
ALTER TABLE messages ADD COLUMN is_github_pull BOOLEAN DEFAULT FALSE;

-- Create an index on is_github_pull for better query performance
CREATE INDEX idx_messages_is_github_pull ON messages(is_github_pull);

-- Update type definitions - this will need to be reflected in types_db.ts manually