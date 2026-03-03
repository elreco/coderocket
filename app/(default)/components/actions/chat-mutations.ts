"use server";

import { format } from "date-fns";
import { after } from "next/server";

import { getSubscription } from "@/app/supabase-server";
import {
  Framework,
  MAX_TOKENS_PER_REQUEST,
  PREMIUM_CHAR_LIMIT,
  defaultTheme,
} from "@/utils/config";
import { defaultArtifactCode } from "@/utils/default-artifact-code";
import { uploadFiles } from "@/utils/file-uploader";
import {
  ROCKET_LIMITS_PER_PLAN,
  tokensToRockets,
} from "@/utils/rocket-conversion";
import { createClient } from "@/utils/supabase/server";
import { getUserTokenUsage } from "@/utils/token-pricing";

import { buildComponent } from "../[slug]/actions";

import { generateUniqueNanoid, fetchChatById } from "./chat-queries";
import {
  getExtraMessagesCount,
  decrementExtraMessagesCount,
} from "./extra-messages";
import { fetchLastAssistantMessageByChatId } from "./message-queries";

export const createChat = async (prompt: string, formData: FormData) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user?.id) {
    return {
      error: {
        title: "You must be logged in to create a component",
        description: "Please login or create an account to continue.",
      },
    };
  }

  const promptToCheck = prompt;

  if (promptToCheck.length > PREMIUM_CHAR_LIMIT) {
    return {
      error: {
        title: "Prompt is too long",
        description: `Your prompt exceeds the limit of ${PREMIUM_CHAR_LIMIT} characters (approximately ${MAX_TOKENS_PER_REQUEST} tokens). Please shorten it to continue.`,
      },
    };
  }

  const subscription = await getSubscription();
  if (!subscription) {
    return {
      error: {
        title: "Paid plan required",
        description:
          "A paid plan is required to create components. Please choose a plan to continue.",
      },
    };
  }

  const subscriptionType =
    subscription.prices?.products?.name?.toLowerCase() || "included";
  const isVisible = formData.get("isVisible");
  const theme = formData.get("theme")?.toString() || defaultTheme;
  const frameworkInput = formData.get("framework")?.toString() || "react";
  const framework = Object.values(Framework).includes(
    frameworkInput as Framework,
  )
    ? frameworkInput
    : Framework.HTML;
  const is_private = isVisible === "false";

  const extraMessages = await getExtraMessagesCount(user.id);
  const currentPeriodStart = new Date(subscription.current_period_start);
  const currentPeriodEnd = new Date(subscription.current_period_end);

  const tokenUsage = await getUserTokenUsage(
    user.id,
    currentPeriodStart,
    currentPeriodEnd,
  );

  const planName = subscription.prices?.products?.name?.toLowerCase() || "free";
  const limits =
    ROCKET_LIMITS_PER_PLAN[planName as keyof typeof ROCKET_LIMITS_PER_PLAN] ||
    ROCKET_LIMITS_PER_PLAN.free;

  const rocketsUsed = tokensToRockets(
    tokenUsage.input_tokens + tokenUsage.output_tokens,
  );

  if (rocketsUsed >= limits.monthly_rockets) {
    if (extraMessages > 0) {
      const decremented = await decrementExtraMessagesCount(user.id);
      if (!decremented) {
        const resetDate = format(currentPeriodEnd, "d MMMM yyyy");
        const billingWindow = subscription
          ? `for this ${subscription.prices?.interval}`
          : "for this month";

        return {
          error: {
            title: "You have reached the limit of your plan",
            description: `You have reached your limit of ${limits.monthly_rockets} 🚀 Rockets ${billingWindow}. This limit will reset on ${resetDate}. Go to My Account to see your usage or purchase Extra Rockets.`,
          },
        };
      }
    } else {
      const resetDate = format(currentPeriodEnd, "d MMMM yyyy");
      const billingWindow = subscription
        ? `for this ${subscription.prices?.interval}`
        : "for this month";

      return {
        error: {
          title: "You have reached the limit of your plan",
          description: `You have reached your limit of ${limits.monthly_rockets} 🚀 Rockets ${billingWindow}. This limit will reset on ${resetDate}. Go to My Account to see your usage or purchase Extra Rockets.`,
        },
      };
    }
  }

  let imageUrl: string | null = null;
  const filesArray: {
    url: string;
    order: number;
    type: string;
    mimeType: string;
    source?: string;
  }[] = [];
  const files = formData.getAll("files") as File[];
  const libraryPathsStr = formData.get("libraryPaths") as string | null;
  const libraryPaths: string[] = libraryPathsStr
    ? JSON.parse(libraryPathsStr)
    : [];

  if (libraryPaths.length > 0) {
    libraryPaths.forEach((libraryPath, i) => {
      const ext = libraryPath.split(".").pop()?.toLowerCase() || "";
      let fileType = "image";
      let mimeType = "image/png";
      if (ext === "pdf") {
        fileType = "pdf";
        mimeType = "application/pdf";
      } else if (ext === "txt") {
        fileType = "text";
        mimeType = "text/plain";
      } else if (["jpg", "jpeg"].includes(ext)) {
        mimeType = "image/jpeg";
      } else if (ext === "gif") {
        mimeType = "image/gif";
      } else if (ext === "webp") {
        mimeType = "image/webp";
      }

      const isFigmaFile = libraryPath.toLowerCase().includes("figma");

      const fileData = {
        url: libraryPath,
        order: filesArray.length + i,
        type: fileType,
        mimeType,
        ...(isFigmaFile && { source: "figma" }),
      };

      filesArray.push(fileData);
      if (filesArray.length === 1) {
        imageUrl = libraryPath;
      }
    });
  }

  if (files.length > 0) {
    const uploadResult = await uploadFiles(files, user.id);

    if (!uploadResult.success) {
      return {
        error: {
          title: "Failed to upload files",
          description: uploadResult.error || "Please try again later.",
        },
      };
    }

    uploadResult.uploadedFiles.forEach((fileInfo, i) => {
      const originalFile = files[i];
      const isFigmaFile = originalFile.name
        .toLowerCase()
        .includes("figma-design");

      const fileData = {
        url: fileInfo.path,
        order: filesArray.length + i,
        type: fileInfo.type,
        mimeType: fileInfo.mimeType,
        ...(isFigmaFile && { source: "figma" }),
      };

      filesArray.push(fileData);
      if (!imageUrl) {
        imageUrl = fileInfo.path;
      }
    });
  }

  const uniqueSlug = await generateUniqueNanoid();

  const cloneUrl = formData.get("cloneUrl") as string | null;

  if (cloneUrl && framework === Framework.HTML) {
    return {
      error: {
        title: "Invalid framework for cloning",
        description:
          "Website cloning is not available with the HTML framework. Please select React, Vue, Angular, or Svelte.",
      },
    };
  }

  const { data } = await supabase
    .from("chats")
    .insert([
      {
        user_id: user.id,
        is_private,
        framework,
        artifact_code:
          defaultArtifactCode[framework as keyof typeof defaultArtifactCode],
        slug: uniqueSlug,
        ...(cloneUrl && { clone_url: cloneUrl }),
      },
    ])
    .select()
    .single();
  if (!data) {
    return {
      error: {
        title: "Failed to create chat",
        description: "Please try again later.",
      },
    };
  }

  const messageContent =
    prompt.trim() || (cloneUrl ? "Clone this website" : prompt);

  const messageData: {
    chat_id: string;
    role: string;
    theme: string;
    prompt_image?: string;
    files?: {
      url: string;
      order: number;
      type?: string;
      mimeType?: string;
      source?: string;
    }[];
    content: string;
    version: number;
    subscription_type: string;
  } = {
    chat_id: data.id,
    role: "user",
    theme,
    content: messageContent,
    version: -1,
    subscription_type: subscriptionType,
  };

  if (imageUrl) {
    messageData.prompt_image = imageUrl;
  }

  if (filesArray.length > 0) {
    messageData.files = filesArray;
  }

  const { error: messageError } = await supabase
    .from("messages")
    .insert(messageData);

  if (messageError) {
    await supabase.from("chats").delete().eq("id", data.id);
    return {
      error: {
        title: "Failed to create message",
        description: "Please try again later.",
      },
    };
  }

  const integrationId = formData.get("integrationId")?.toString();
  if (integrationId) {
    await supabase.from("chat_integrations").insert({
      chat_id: data.id,
      integration_id: integrationId,
      is_enabled: true,
    });
  }

  return { slug: data.slug };
};

const createRemixTitle = (originalTitle: string) => {
  let baseTitle = originalTitle;
  if (baseTitle.startsWith("Remix of ")) {
    baseTitle = baseTitle.substring(9);
  }
  if (baseTitle.startsWith("Remix - ")) {
    baseTitle = baseTitle.substring(8);
  }
  return baseTitle;
};

export const remixChat = async (
  chatId: string,
  selectedVersion: number | undefined,
) => {
  const supabase = await createClient();

  const { data: originalChat } = await supabase
    .from("chats")
    .select(
      `
      id,
      artifact_code,
      title,
      framework,
      prompt_image,
      user_id,
      remix_chat_id,
      clone_url
    `,
    )
    .eq("id", chatId)
    .single();

  if (!originalChat) {
    throw new Error("Chat not found");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const subscription = await getSubscription();

  if (!subscription) {
    throw new Error("Only subscribers can remix projects");
  }

  const uniqueId = await generateUniqueNanoid();
  const { data: newChat, error } = await supabase
    .from("chats")
    .insert({
      artifact_code: originalChat.artifact_code,
      title: createRemixTitle(originalChat.title || "Untitled Project"),
      framework: originalChat.framework,
      prompt_image: originalChat.prompt_image,
      user_id: user.id,
      remix_chat_id: originalChat.id,
      clone_url: originalChat.clone_url,
      is_private: false,
      slug: uniqueId,
    })
    .select()
    .single();

  if (error) {
    throw new Error("Failed to create remix");
  }

  const { data: versionData } = await supabase
    .from("messages")
    .select("version")
    .eq("chat_id", chatId)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (!versionData) {
    throw new Error("Could not determine the latest version");
  }

  const targetVersion =
    selectedVersion !== undefined ? selectedVersion : versionData.version;

  const { data: originalMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .gte("version", 0)
    .lte("version", targetVersion)
    .order("version", { ascending: true })
    .order("created_at", { ascending: true });

  if (!originalMessages || originalMessages.length === 0) {
    throw new Error("Original chat has no messages");
  }

  const versionOffset = 0;

  const messagesToInsert = originalMessages.map((message) => ({
    chat_id: newChat.id,
    role: message.role,
    content: message.content,
    version: message.version - versionOffset,
    is_built: false,
    is_building: message.role === "assistant" ? true : null,
    screenshot: null,
    theme: message.theme,
    artifact_code: message.artifact_code,
    prompt_image: message.prompt_image,
    input_tokens: message.input_tokens,
    output_tokens: message.output_tokens,
  }));

  const { error: messagesError } = await supabase
    .from("messages")
    .insert(messagesToInsert);

  if (messagesError) {
    throw new Error("Failed to copy messages");
  }

  const isOwner = originalChat.user_id === user.id;

  if (isOwner) {
    const { data: originalIntegrations } = await supabase
      .from("chat_integrations")
      .select("integration_id, is_enabled")
      .eq("chat_id", chatId);

    if (originalIntegrations && originalIntegrations.length > 0) {
      await supabase.from("chat_integrations").insert(
        originalIntegrations.map((integration) => ({
          chat_id: newChat.id,
          integration_id: integration.integration_id,
          is_enabled: integration.is_enabled,
        })),
      );
    }
  }

  after(async () => {
    const chat = await fetchChatById(newChat.id);
    if (!chat) return;

    const lastAssistantMessage = await fetchLastAssistantMessageByChatId(
      newChat.id,
    );
    if (lastAssistantMessage) {
      await buildComponent(newChat.id, lastAssistantMessage.version);
    }
  });

  return newChat;
};
