-- Add auto_deploy column to chats table
-- When enabled, new versions will be automatically deployed after build succeeds
ALTER TABLE chats
ADD COLUMN auto_deploy boolean DEFAULT true;

COMMENT ON COLUMN chats.auto_deploy IS 'Whether to automatically deploy new versions when they are built (only applies when is_deployed is true)';

