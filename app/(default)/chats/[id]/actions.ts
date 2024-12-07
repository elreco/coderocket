/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getSubscription } from "@/app/supabase-server";
import { createClient } from "@/utils/supabase/server";

export const changeVisiblity = async (
  isVisible: boolean,
  id: string,
): Promise<void> => {
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
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update visibility: ${error.message}`);
  }
};

export const deleteVersion = async (
  chatId: string,
  id: number,
): Promise<void> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");
  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }

  const { data: chatData, error: fetchError } = await supabase
    .from("chats")
    .select("messages")
    .eq("user_id", user.id)
    .eq("id", chatId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch chat: ${fetchError.message}`);
  }

  if (chatData.messages.length <= 1) {
    throw new Error(
      "Unable to delete the version, there is only one message left.",
    );
  }

  const updatedMessages = chatData.messages.filter((msg: any) => msg.id !== id);

  const deletedMessageIndex = chatData.messages.findIndex(
    (msg: any) => msg.id === id,
  );

  const assistantMessageId = chatData.messages[deletedMessageIndex - 1]?.id;

  const finalMessages = updatedMessages.filter(
    (msg: any) => msg.id !== assistantMessageId,
  );

  const versionUpdated = finalMessages.reduce(
    (acc: any[], msg: any, index: number) => {
      if (msg.role === "assistant") {
        acc.push({ ...msg, version: Math.floor(index / 2) });
      } else {
        acc.push({ ...msg, version: -1 });
      }
      return acc;
    },
    [],
  );

  const { error: updateError } = await supabase
    .from("chats")
    .update({ messages: versionUpdated })
    .eq("user_id", user.id)
    .eq("id", chatId);

  if (updateError) {
    throw new Error(`Failed to delete version: ${updateError.message}`);
  }
};
