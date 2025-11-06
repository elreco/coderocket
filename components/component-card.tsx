import { GetComponentsReturnType } from "@/app/(default)/components/actions";

import { UnifiedCard, UnifiedCardData } from "./unified-card";

interface ComponentCardProps {
  chat: GetComponentsReturnType;
  isReverse?: boolean;
}

export function ComponentCard({ chat, isReverse }: ComponentCardProps) {
  const cardData: UnifiedCardData = {
    id: chat.chat_id,
    title: chat.title || chat.first_user_message,
    imageUrl: chat.last_assistant_message,
    framework: chat.framework,
    createdAt: chat.created_at,
    author: {
      id: chat.user_id,
      name: chat.user_full_name || "Anonymous user",
    },
    user_avatar_url: chat.user_avatar_url,
    href: `/components/${chat.slug || chat.chat_id}`,
    likes: chat.likes || 0,
    isLiked: chat.user_has_liked,
    isRemixed: !!chat.remix_chat_id,
    cloneUrl: chat.clone_url,
  };

  return <UnifiedCard data={cardData} isReverse={isReverse} />;
}
