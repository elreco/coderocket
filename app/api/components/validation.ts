import {
  decrementExtraMessagesCount,
  fetchChatById,
  getExtraMessagesCount,
} from "@/app/(default)/components/actions";
import { getSubscription } from "@/app/supabase-server";
import { Tables } from "@/types_db";
import { PREMIUM_CHAR_LIMIT, MAX_TOKENS_PER_REQUEST } from "@/utils/config";
import {
  tokensToRockets,
  getPlanRocketLimits,
} from "@/utils/rocket-conversion";
import { createClient } from "@/utils/supabase/server";
import { getUserTokenUsage } from "@/utils/token-pricing";

type SubscriptionWithPrices = Awaited<ReturnType<typeof getSubscription>>;

export interface ValidatedUser {
  user: { id: string; email?: string };
  supabase: Awaited<ReturnType<typeof createClient>>;
}

export interface UsageLimitsResult {
  subscription: SubscriptionWithPrices;
  withinLimits: boolean;
}

export async function validateUser(): Promise<ValidatedUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Could not get user");
  }

  return { user, supabase };
}

export async function validateChatOwnership(
  chatId: string,
  userId: string,
): Promise<Tables<"chats">> {
  const chat = await fetchChatById(chatId);

  if (!chat) {
    throw new Error("Could not get chat data");
  }

  if (chat.user?.id !== userId) {
    throw new Error("User is not authorized to modify chat");
  }

  return chat;
}

export function validatePromptLength(prompt: string | null): void {
  if (prompt && prompt.length > PREMIUM_CHAR_LIMIT) {
    throw new Error(
      `Votre prompt dépasse la limite de ${PREMIUM_CHAR_LIMIT} caractères (environ ${MAX_TOKENS_PER_REQUEST} tokens). Veuillez le raccourcir pour continuer.`,
    );
  }
}

export async function checkUsageLimits(
  userId: string,
  subscription: SubscriptionWithPrices,
): Promise<void> {
  const extraMessages = await getExtraMessagesCount(userId);

  let currentPeriodStart: Date;
  let currentPeriodEnd: Date;
  let planName: string;

  if (subscription) {
    currentPeriodStart = new Date(subscription.current_period_start);
    currentPeriodEnd = new Date(subscription.current_period_end);
    planName = subscription.prices?.products?.name || "free";
  } else {
    const today = new Date();
    currentPeriodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    currentPeriodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    planName = "free";
  }

  const tokenUsage = await getUserTokenUsage(
    userId,
    currentPeriodStart,
    currentPeriodEnd,
  );

  const limits = getPlanRocketLimits(planName);
  const rocketsUsed = tokensToRockets(
    tokenUsage.input_tokens + tokenUsage.output_tokens,
  );

  if (rocketsUsed >= limits.monthly_rockets) {
    if (extraMessages > 0) {
      const decremented = await decrementExtraMessagesCount(userId);
      if (!decremented) {
        throw new Error("limit-exceeded");
      }
    } else {
      throw new Error("limit-exceeded");
    }
  }
}

export function validateFileUploadPermission(
  subscription: SubscriptionWithPrices,
  hasFiles: boolean,
): void {
  if (!subscription && hasFiles) {
    throw new Error("payment-required-for-image");
  }
}

export type { UploadedFileInfo } from "@/types/api";

export function getFileTypeFromPath(filePath: string): {
  type: "image" | "pdf" | "text";
  mimeType: string;
} {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf") {
    return { type: "pdf", mimeType: "application/pdf" };
  }

  if (ext === "txt") {
    return { type: "text", mimeType: "text/plain" };
  }

  const imageMimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };

  return {
    type: "image",
    mimeType: imageMimeTypes[ext] || "image/png",
  };
}
