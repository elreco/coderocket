"use server";

import { after } from "next/server";

import { getSubscription } from "@/app/supabase-server";
import { takeScreenshot } from "@/utils/capture-screenshot";
import { hasArtifacts } from "@/utils/completion-parser";
import { createClient } from "@/utils/supabase/server";

export const changeVisibilityByChatId = async (
  chatId: string,
  isVisible: boolean,
) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");
  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }

  const { error } = await supabase
    .from("chats")
    .update({ is_private: !isVisible })
    .eq("user_id", user.id)
    .eq("id", chatId);

  if (error) {
    throw new Error(`Failed to update visibility: ${error.message}`);
  }
};

export const deleteVersionByMessageId = async (messageId: number) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");
  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }

  const { data: message, error: fetchError } = await supabase
    .from("messages")
    .select("id, chat_id, version, chats(id)")
    .eq("id", messageId)
    .eq("chats.user_id", user.id)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!message) {
    throw new Error("Message not found or user not authorized.");
  }

  // Suppression des messages avec la même version
  const { error: deleteError } = await supabase
    .from("messages")
    .delete()
    .eq("version", message.version)
    .eq("chat_id", message.chat_id);

  if (deleteError) {
    throw new Error(`Failed to delete messages: ${deleteError.message}`);
  }

  // Récupération des messages ayant une version supérieure
  const { data: messagesToUpdate, error: fetchMessagesError } = await supabase
    .from("messages")
    .select("id, version")
    .gt("version", message.version)
    .eq("chat_id", message.chat_id);

  if (fetchMessagesError) {
    throw new Error(
      `Failed to fetch messages for version update: ${fetchMessagesError.message}`,
    );
  }

  if (!messagesToUpdate || messagesToUpdate.length === 0) {
    return; // Aucun message à mettre à jour
  }

  // Mise à jour des messages individuellement
  for (const msg of messagesToUpdate) {
    const { error: updateError } = await supabase
      .from("messages")
      .update({ version: msg.version - 1 })
      .eq("id", msg.id);

    if (updateError) {
      throw new Error(
        `Failed to update message ID ${msg.id}: ${updateError.message}`,
      );
    }
  }
};

export const updateTheme = async (
  chatId: string,
  theme: string,
  version: number,
  completion: string,
) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, framework")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (chatError) {
    throw new Error(`Failed to fetch chat: ${chatError.message}`);
  }

  await supabase
    .from("messages")
    .update({ theme, content: completion })
    .eq("chat_id", chatId)
    .eq("version", version)
    .eq("role", "assistant");
  const hasArtifactResult = hasArtifacts(completion);
  if (hasArtifactResult) {
    after(async () => {
      await takeScreenshot(chatId, version, theme, chat?.framework || "react");
    });
  }
};
