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

  if (streamId === null) {
    // Release the generation lock when clearing the stream ID
    await supabase.from("generation_locks").delete().eq("chat_id", chatId);
  }

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

    // Use the PostgreSQL function for atomic lock acquisition
    // The function uses INSERT with unique constraint for true atomicity
    const { data: lockAcquired, error: rpcError } = await supabase.rpc(
      "try_acquire_generation_lock",
      {
        p_chat_id: chatId,
        p_lock_id: lockId,
        p_stale_threshold_minutes: 5,
      },
    );

    if (rpcError) {
      console.warn("Lock RPC error:", rpcError.code, rpcError.message);
      return false;
    }

    if (!lockAcquired) {
      console.log(
        `Generation lock not acquired for chat ${chatId} - another generation is in progress`,
      );
      return false;
    }

    console.log(`Generation lock acquired (${lockId}) for chat ${chatId}`);
    return true;
  } catch (error) {
    console.error("Lock mechanism failed:", error);
    return false;
  }
};

export const tryAcquireBuildLock = async (
  chatId: string,
  version: number,
  lockId: string,
): Promise<boolean> => {
  try {
    const supabase = await createClient();

    const BUILD_LOCK_TIMEOUT_MS = 3 * 60 * 1000;

    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("is_built, is_building, build_error")
      .eq("chat_id", chatId)
      .eq("version", version)
      .eq("role", "assistant")
      .single();

    if (fetchError || !message) {
      console.warn("Could not fetch message for build lock:", fetchError);
      return false;
    }

    if (message.is_built === true) {
      console.log(
        `[tryAcquireBuildLock] Cannot acquire lock: already built (is_built=${message.is_built})`,
      );
      return false;
    }

    if (message.is_building === true) {
      const buildError = message.build_error as {
        lock_id?: string;
        lock_started_at?: string;
      } | null;

      if (buildError?.lock_started_at) {
        const lockAge =
          Date.now() - new Date(buildError.lock_started_at).getTime();
        if (lockAge < BUILD_LOCK_TIMEOUT_MS) {
          console.log(
            `Build lock held by ${buildError.lock_id}, age: ${lockAge}ms`,
          );
          return false;
        }
        console.log(
          `Stale build lock detected (age: ${lockAge}ms), acquiring...`,
        );
      } else {
        console.log("Build in progress but no lock timestamp, acquiring...");
      }
    }

    console.log(
      `[tryAcquireBuildLock] Attempting to update is_building for chat ${chatId}, version ${version}`,
      {
        current_is_built: message.is_built,
        current_is_building: message.is_building,
      },
    );

    const { data: verifyData } = await supabase
      .from("messages")
      .select("id, is_built, is_building")
      .eq("chat_id", chatId)
      .eq("version", version)
      .eq("role", "assistant")
      .single();

    console.log(
      `[tryAcquireBuildLock] Message found before update:`,
      verifyData,
    );

    if (!verifyData || !verifyData.id) {
      console.warn(
        `[tryAcquireBuildLock] Message not found for chat ${chatId}, version ${version}`,
      );
      return false;
    }

    const updatePayload: {
      is_building: boolean;
      build_error: {
        lock_id: string;
        lock_started_at: string;
      };
    } = {
      is_building: true,
      build_error: {
        lock_id: lockId,
        lock_started_at: new Date().toISOString(),
      },
    };

    console.log(
      `[tryAcquireBuildLock] Update payload:`,
      JSON.stringify(updatePayload),
    );

    const { data, error } = await supabase
      .from("messages")
      .update(updatePayload)
      .eq("id", verifyData.id)
      .select("id, build_error, is_building");

    if (error) {
      console.warn(
        `[tryAcquireBuildLock] Build lock error:`,
        error.code,
        error.message,
      );
      return false;
    }

    if (data && data.length > 0) {
      console.log(
        `[tryAcquireBuildLock] Lock acquired and is_building set to true for chat ${chatId}, version ${version}`,
        { updated_rows: data.length, is_building: data[0]?.is_building },
      );
      return true;
    } else {
      console.log(
        `[tryAcquireBuildLock] No rows updated for chat ${chatId}, version ${version}`,
      );
    }

    if (!data || data.length === 0) {
      const { data: checkData } = await supabase
        .from("messages")
        .select("is_built, is_building")
        .eq("chat_id", chatId)
        .eq("version", version)
        .eq("role", "assistant")
        .single();

      if (checkData?.is_built === true || checkData?.is_building === true) {
        return false;
      }

      const retryResult = await supabase
        .from("messages")
        .update({
          is_building: true,
          build_error: {
            lock_id: lockId,
            lock_started_at: new Date().toISOString(),
          },
        })
        .eq("chat_id", chatId)
        .eq("version", version)
        .eq("role", "assistant")
        .or("is_built.is.null,is_built.eq.false")
        .or("is_building.is.null,is_building.eq.false")
        .select("id");

      if (!retryResult.data || retryResult.data.length === 0) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Build lock mechanism failed:", error);
    return false;
  }
};

export const releaseBuildLock = async (
  chatId: string,
  version: number,
  success: boolean,
  buildError?: {
    title: string;
    description: string;
    errors: string[];
    exitCode?: number;
  },
): Promise<void> => {
  try {
    const supabase = await createClient();

    const { error: updateError } = await supabase
      .from("messages")
      .update({
        is_built: success,
        is_building: false,
        build_error: buildError || null,
      })
      .eq("chat_id", chatId)
      .eq("version", version)
      .eq("role", "assistant");

    if (updateError) {
      console.error(
        `[releaseBuildLock] Failed to update build status for chat ${chatId}, version ${version}:`,
        updateError,
      );
    } else {
      console.log(
        `[releaseBuildLock] Build status updated: is_built=${success}, is_building=false for chat ${chatId}, version ${version}`,
      );
    }
  } catch (error) {
    console.error("Failed to release build lock:", error);
  }
};
