"use server";

import { createClient } from "@/utils/supabase/server";

export const fetchChatById = async (idOrSlug: string) => {
  const supabase = await createClient();

  const isUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      idOrSlug,
    );

  const chatsWithUser = supabase
    .from("chats")
    .select(
      `
    *,
    user:users!user_id (*)
`,
    )
    .eq(isUuid ? "id" : "slug", idOrSlug)
    .single();

  const { data } = await chatsWithUser;

  return data;
};

export const fetchChatsByUserId = async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chats")
    .select(
      `
      *,
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data;
};

export const fetchChatDataOptimized = async (chatId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const [chatResult, messagesResult, likeResult] = await Promise.all([
    supabase
      .from("chats")
      .select("*, user:users!user_id (*)")
      .eq("id", chatId)
      .single(),
    supabase
      .from("messages")
      .select(
        `
      *,
      chats (
        user:users (*),
        prompt_image,
        remix_chat_id
      )
    `,
      )
      .eq("chat_id", chatId)
      .order("version", { ascending: false })
      .order("role", { ascending: false }),
    user
      ? supabase
          .from("chat_likes")
          .select("id")
          .eq("chat_id", chatId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const messages = messagesResult.data || [];

  const serializedMessages = messages.map((msg) => ({
    ...msg,
    files: msg.files ? JSON.parse(JSON.stringify(msg.files)) : null,
  }));

  const lastAssistantMessage = serializedMessages.find(
    (m) => m.role === "assistant",
  );
  const lastUserMessage = serializedMessages.find((m) => m.role === "user");

  return {
    chat: chatResult.data,
    messages: serializedMessages,
    lastAssistantMessage,
    lastUserMessage,
    isLiked: !!likeResult.data,
  };
};

export const generateUniqueNanoid = async () => {
  const { nanoid } = await import("nanoid");
  const supabase = await createClient();
  let uniqueId;
  let isUnique = false;

  while (!isUnique) {
    uniqueId = nanoid(11);
    const { data } = await supabase
      .from("chats")
      .select("id")
      .eq("slug", uniqueId)
      .single();

    if (!data) {
      isUnique = true;
    }
  }

  return uniqueId;
};
