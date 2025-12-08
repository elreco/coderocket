CREATE INDEX IF NOT EXISTS idx_messages_role_chat_id_created_at_asc
ON public.messages(role, chat_id, created_at ASC)
WHERE role = 'user';

CREATE INDEX IF NOT EXISTS idx_messages_role_chat_id_created_at_desc
ON public.messages(role, chat_id, created_at DESC)
WHERE role = 'assistant';

CREATE INDEX IF NOT EXISTS idx_chats_remix_chat_id
ON public.chats(remix_chat_id)
WHERE remix_chat_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chats_is_deployed_deployed_at
ON public.chats(is_deployed, deployed_at DESC)
WHERE is_deployed = true AND deployed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chats_framework_is_private_created_at
ON public.chats(framework, is_private, created_at DESC)
WHERE is_private = false;

CREATE INDEX IF NOT EXISTS idx_chats_likes_created_at
ON public.chats(likes DESC, created_at DESC)
WHERE is_private = false;

