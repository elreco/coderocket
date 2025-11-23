ALTER TABLE token_usage_tracking
DROP CONSTRAINT IF EXISTS token_usage_tracking_message_id_fkey;

ALTER TABLE token_usage_tracking
ADD CONSTRAINT token_usage_tracking_message_id_fkey
FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL;

