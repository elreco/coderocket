CREATE POLICY "Anyone can view custom domains for public deployed chats"
  ON custom_domains FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = custom_domains.chat_id
        AND chats.is_private = false
        AND chats.is_deployed = true
    )
  );

COMMENT ON POLICY "Anyone can view custom domains for public deployed chats" ON custom_domains IS
  'Allows anyone to view custom domains for public deployed chats so that visitors can see the correct URL in the deployed badge';




