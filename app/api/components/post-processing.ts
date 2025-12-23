import { LanguageModelUsage } from "ai";
import { after } from "next/server";

import { buildComponent } from "@/app/(default)/components/[slug]/actions";
import { autoSyncToGithubAfterGeneration } from "@/app/(default)/components/[slug]/github-sync-actions";
import { fetchChatById } from "@/app/(default)/components/actions";
import { getSubscription } from "@/app/supabase-server";
import { takeScreenshot } from "@/utils/capture-screenshot";
import {
  extractDataTheme,
  extractTitle,
  getUpdatedArtifactCode,
} from "@/utils/completion-parser";
import { Framework } from "@/utils/config";
import { getPreviousArtifactCode } from "@/utils/supabase/artifact-helpers";
import { createClient } from "@/utils/supabase/server";
import { calculateTokenCost } from "@/utils/token-pricing";

export type { UploadedFileInfo } from "@/types/api";

export const updateDataAfterCompletion = async (
  chatId: string,
  text: string,
  usage: LanguageModelUsage,
  finishReason: string | null,
  version: number,
) => {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const chat = await fetchChatById(chatId);
    if (!chat) {
      console.error("Could not get chat data");
      return;
    }

    if (!text) {
      console.error(
        "❌ updateDataAfterCompletion: No completion text provided",
      );
      return;
    }

    const previousArtifactCode =
      (await getPreviousArtifactCode(chatId, version)) || "";

    let artifactCode: string;
    try {
      artifactCode = getUpdatedArtifactCode(text, previousArtifactCode);

      if (!artifactCode || artifactCode.trim() === "") {
        console.error(
          `[Patch] Generated artifact code is empty. Using previous artifact code to prevent corruption.`,
        );
        artifactCode = previousArtifactCode || chat.artifact_code || "";
      }

      if (!artifactCode.includes("<coderocketArtifact")) {
        console.error(
          `[Patch] Generated artifact code is malformed. Using previous artifact code to prevent corruption.`,
        );
        artifactCode = previousArtifactCode || chat.artifact_code || "";
      }
    } catch (error) {
      console.error(
        `[Patch] Error generating artifact code:`,
        error instanceof Error ? error.message : String(error),
      );
      console.error(
        `[Patch] Using previous artifact code to prevent corruption.`,
      );
      artifactCode = previousArtifactCode || chat.artifact_code || "";
    }

    const { data: currentChatData, error } = await supabase
      .from("chats")
      .select("input_tokens, output_tokens, title")
      .eq("id", chatId)
      .single();

    if (error) {
      console.error("Error fetching current tokens:", error);
      return;
    }

    const currentInputTokens = currentChatData?.input_tokens || 0;
    const currentOutputTokens = currentChatData?.output_tokens || 0;

    if (currentChatData.title) {
      await supabase
        .from("chats")
        .update({
          artifact_code: artifactCode,
          input_tokens: currentInputTokens + (usage.inputTokens ?? 0),
          output_tokens: currentOutputTokens + (usage.outputTokens ?? 0),
        })
        .eq("id", chatId);
    } else {
      await supabase
        .from("chats")
        .update({
          artifact_code: artifactCode,
          title: extractTitle(text),
          input_tokens: currentInputTokens + (usage.inputTokens ?? 0),
          output_tokens: currentOutputTokens + (usage.outputTokens ?? 0),
        })
        .eq("id", chatId);
    }

    const cacheCreationInputTokens = 0;
    const cacheReadInputTokens = usage.cachedInputTokens ?? 0;

    const modelUsed = "claude-sonnet-4-5";
    const cost = calculateTokenCost(
      {
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
        cache_creation_input_tokens: cacheCreationInputTokens,
        cache_read_input_tokens: cacheReadInputTokens,
      },
      modelUsed,
    );

    const { error: updateUserError } = await supabase
      .from("messages")
      .update({
        input_tokens: usage.inputTokens ?? 0,
        cache_creation_input_tokens: cacheCreationInputTokens,
        cache_read_input_tokens: cacheReadInputTokens,
      })
      .eq("chat_id", chatId)
      .eq("version", version)
      .eq("role", "user");

    if (updateUserError) {
      console.error("Error updating user message:", updateUserError);
    }

    const theme = extractDataTheme(text);

    let content = text;
    let hasError = false;
    if (finishReason === "length" || finishReason === "error") {
      content = `${text}\n\n<!-- FINISH_REASON: ${finishReason} -->`;
      hasError = true;
    }

    const subscription = await getSubscription();
    let subscriptionType = "trial";
    if (subscription) {
      subscriptionType =
        subscription.prices?.products?.name?.toLowerCase() || "trial";
    }

    const { error: insertAssistantError, data: insertedMessage } =
      await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          screenshot: null,
          version,
          content: content,
          theme,
          role: "assistant",
          input_tokens: usage.inputTokens ?? 0,
          output_tokens: usage.outputTokens ?? 0,
          subscription_type: subscriptionType,
          artifact_code: artifactCode,
          cache_creation_input_tokens: cacheCreationInputTokens,
          cache_read_input_tokens: cacheReadInputTokens,
          cost_usd: cost,
          model_used: modelUsed,
        })
        .select()
        .single();

    if (insertAssistantError) {
      console.error("Error inserting assistant message:", insertAssistantError);
    }

    if (insertedMessage) {
      await supabase.from("token_usage_tracking").insert({
        user_id: user.id,
        chat_id: chatId,
        message_id: insertedMessage.id,
        usage_type: "generation",
        model_used: modelUsed,
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
        cache_creation_input_tokens: cacheCreationInputTokens,
        cache_read_input_tokens: cacheReadInputTokens,
        cost_usd: cost,
      });
    }

    after(async () => {
      if (hasError) {
        return;
      }

      if (chat.framework === Framework.HTML) {
        await takeScreenshot(chatId, version, theme, Framework.HTML);
      } else {
        await buildComponent(chatId, version);
      }

      await autoSyncToGithubAfterGeneration(chatId, version);
    });
  } catch (error) {
    console.error("=== updateDataAfterCompletion Error ===");
    console.error("ChatId:", chatId);
    console.error("Version:", version);
    console.error("Error details:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
};

export const setActiveStreamId = async (
  chatId: string,
  streamId: string | null,
): Promise<void> => {
  const supabase = await createClient();
  const updateData: Record<string, unknown> = {
    active_stream_id: streamId,
    active_stream_started_at: streamId ? new Date().toISOString() : null,
  };
  await supabase.from("chats").update(updateData).eq("id", chatId);
};

export const tryAcquireGenerationLock = async (
  chatId: string,
  lockId: string,
): Promise<boolean> => {
  try {
    const supabase = await createClient();

    const STALE_THRESHOLD_MS = 5 * 60 * 1000;
    const staleThreshold = new Date(
      Date.now() - STALE_THRESHOLD_MS,
    ).toISOString();

    const { data, error } = await supabase
      .from("chats")
      .update({
        active_stream_id: lockId,
        active_stream_started_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", chatId)
      .or(
        `active_stream_id.is.null,active_stream_started_at.is.null,active_stream_started_at.lt.${staleThreshold}`,
      )
      .select("id");

    if (error) {
      if (error.code === "42703") {
        console.warn(
          "Lock columns not found - skipping lock (run migration to enable)",
        );
        return true;
      }
      console.error("Error acquiring lock:", error);
      return true;
    }

    return data !== null && data.length > 0;
  } catch {
    console.warn("Lock mechanism failed - continuing without lock");
    return true;
  }
};
