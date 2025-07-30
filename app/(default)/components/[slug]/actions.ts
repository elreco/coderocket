"use server";

import { after } from "next/server";

import { getSubscription } from "@/app/supabase-server";
import { takeScreenshot } from "@/utils/capture-screenshot";
import {
  extractFilesFromArtifact,
  getUpdatedArtifactCode,
  hasArtifacts,
} from "@/utils/completion-parser";
import { builderApiUrl, Framework } from "@/utils/config";
import { promptEnhancer } from "@/utils/prompt-enhancer";
import { createClient } from "@/utils/supabase/server";

import {
  fetchAssistantMessageByChatIdAndVersion,
  fetchChatById,
  fetchLastAssistantMessageByChatId,
} from "../actions";

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

  // If trying to make the component public, check if it's listed on marketplace
  // Business rule: Components listed on marketplace must remain private to maintain
  // exclusivity for buyers who purchase access to these components
  if (isVisible) {
    const { data: marketplaceListing, error: marketplaceError } = await supabase
      .from("marketplace_listings")
      .select("id, title")
      .eq("chat_id", chatId)
      .eq("seller_id", user.id)
      .eq("is_active", true)
      .single();

    if (marketplaceError && marketplaceError.code !== "PGRST116") {
      // PGRST116 is "no rows returned", which is fine
      console.error("Error checking marketplace listing:", marketplaceError);
    }

    if (marketplaceListing) {
      // This should not happen in normal usage as the UI prevents it,
      // but we keep this as a security measure
      throw new Error("marketplace-listed");
    }
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

export const improvePromptByChatId = async (chatId: string, prompt: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) throw new Error("Could not get user");
  const subscription = await getSubscription();
  if (!subscription) {
    throw new Error("payment-required");
  }
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, framework")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();
  if (chatError) {
    throw new Error(`Failed to fetch chat: ${chatError.message}`);
  }
  return await promptEnhancer(prompt, chat?.framework as Framework);
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
  // get new messages
  const refreshedChatMessages = await fetchLastAssistantMessageByChatId(
    message.chat_id,
  );
  if (!refreshedChatMessages) {
    throw new Error("No refreshed chat messages found");
  }
  // get chat
  const { data: chat } = await supabase
    .from("chats")
    .select("id, artifact_code, framework")
    .eq("id", message.chat_id)
    .single();

  if (!chat) {
    throw new Error("No chat found");
  }
  const artifactCode = getUpdatedArtifactCode(
    refreshedChatMessages.content,
    chat.artifact_code || "",
  );
  await supabase
    .from("chats")
    .update({ artifact_code: artifactCode })
    .eq("id", message.chat_id);
  after(async () => {
    await buildComponent(message.chat_id, message.version, true);
  });
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

export const buildComponent = async (
  chatId: string,
  version: number,
  forceBuild?: boolean,
) => {
  try {
    const lastAssistantMessage = await fetchAssistantMessageByChatIdAndVersion(
      chatId,
      version,
    );
    if (!lastAssistantMessage) {
      throw new Error("No last assistant message found");
    }

    if (lastAssistantMessage.is_built && !forceBuild) {
      return;
    }

    const chat = await fetchChatById(chatId);
    if (!chat) {
      throw new Error("No chat found");
    }

    if (chat.framework === Framework.HTML) {
      return;
    }
    const newArtifactFiles = extractFilesFromArtifact(
      lastAssistantMessage.artifact_code || "",
    );

    if (!newArtifactFiles.length) {
      throw new Error("No files found in completion");
    }
    // Make the POST request to the builder API
    const builderResponse = await fetch(`${builderApiUrl}/build`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId,
        version,
        files: newArtifactFiles,
        forceBuild,
      }),
    });

    // Parse the response
    const responseData = await builderResponse.json();
    if (responseData.errors) {
      throw new Error(responseData.errors);
    }

    // update the message with the build status
    const supabase = await createClient();
    await supabase
      .from("messages")
      .update({ is_built: responseData.event === "success" })
      .eq("chat_id", chatId)
      .eq("role", "assistant")
      .eq("version", version);

    await takeScreenshot(
      chatId,
      version,
      undefined,
      chat.framework || Framework.REACT,
    );
  } catch (error) {
    console.error("API error:", error);
  }
};

export const checkExistingComponent = async (
  chatId: string,
  version: number,
) => {
  const builderResponse = await fetch(
    `${builderApiUrl}/check-build/${chatId}/${version}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const responseData = await builderResponse.json();

  if (responseData.errors) {
    return false;
  }

  return responseData.exists;
};
