"use server";

import { createClient } from "@/utils/supabase/server";

export const toggleChatLike = async (chatId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return { error: "User not authenticated" };
  }

  const { data: existingLike } = await supabase
    .from("chat_likes")
    .select("id")
    .eq("chat_id", chatId)
    .eq("user_id", user.id)
    .single();

  if (existingLike) {
    const { error: deleteError } = await supabase
      .from("chat_likes")
      .delete()
      .eq("id", existingLike.id);

    if (deleteError) {
      console.error("Erreur lors de la suppression du like:", deleteError);
      return { error: "Erreur lors de la suppression du like" };
    }

    const { data: chatData, error: chatDataError } = await supabase
      .from("chats")
      .select("likes")
      .eq("id", chatId)
      .single();

    if (chatDataError) {
      console.error(
        "Erreur lors de la récupération des données du chat:",
        chatDataError,
      );
      return { error: "Erreur lors de la récupération des données du chat" };
    }

    if (chatData) {
      await supabase
        .from("chats")
        .update({ likes: chatData.likes ? chatData.likes - 1 : 0 })
        .eq("id", chatId);
    }

    return { message: "Like removed" };
  } else {
    const { error: newLikeError } = await supabase.from("chat_likes").insert({
      chat_id: chatId,
      user_id: user.id,
    });

    if (newLikeError) {
      console.error("Erreur lors de l'ajout du like:", newLikeError);
      return { error: "Erreur lors de l'ajout du like" };
    }

    const { data: chatData, error: chatDataError } = await supabase
      .from("chats")
      .select("likes")
      .eq("id", chatId)
      .single();

    if (chatDataError) {
      console.error(
        "Erreur lors de la récupération des données du chat:",
        chatDataError,
      );
      return { error: "Erreur lors de la récupération des données du chat" };
    }

    if (chatData) {
      await supabase
        .from("chats")
        .update({ likes: chatData.likes ? chatData.likes + 1 : 1 })
        .eq("id", chatId);
    }

    return { message: "Like added" };
  }
};

export const hasUserLikedChat = async (chatId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return false;
  }

  const { data: existingLike } = await supabase
    .from("chat_likes")
    .select("id")
    .eq("chat_id", chatId)
    .eq("user_id", user.id)
    .single();

  return !!existingLike;
};
