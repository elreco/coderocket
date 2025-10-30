CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_role ON public.messages(chat_id, role);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_role_version ON public.messages(chat_id, role, version DESC);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_version ON public.messages(chat_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);

CREATE INDEX IF NOT EXISTS idx_chats_slug ON public.chats(slug);

CREATE INDEX IF NOT EXISTS idx_chats_is_featured ON public.chats(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_chats_is_private ON public.chats(is_private);

CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_likes_chat_id_user_id ON public.chat_likes(chat_id, user_id);

CREATE INDEX IF NOT EXISTS idx_chat_likes_user_id ON public.chat_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

