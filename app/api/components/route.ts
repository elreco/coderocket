export const maxDuration = 300;
import { CoreMessage, LanguageModelUsage, streamText } from "ai";
import { after } from "next/server";

import { buildComponent } from "@/app/(default)/components/[slug]/actions";
import {
  fetchChatById,
  fetchLastUserMessageByChatId,
  fetchMessagesByChatId,
  fetchUserMessageByChatIdAndVersion,
} from "@/app/(default)/components/actions";
import { getSubscription } from "@/app/supabase-server";
import { Tables } from "@/types_db";
import { takeScreenshot } from "@/utils/capture-screenshot";
import {
  extractDataTheme,
  extractTitle,
  getUpdatedArtifactCode,
} from "@/utils/completion-parser";
import {
  Framework,
  TRIAL_PLAN_MESSAGES_PER_DAY,
  anthropicModel,
  getMaxMessagesPerPeriod,
  storageUrl,
} from "@/utils/config";
// import { promptEnhancer } from "@/utils/prompt-enhancer";
import { formatToTimestamp } from "@/utils/date";
import { createClient } from "@/utils/supabase/server";
import { systemPrompt } from "@/utils/system-prompts";
import { htmlSystemPrompt } from "@/utils/system-prompts/html";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const id = formData.get("id") as string;
    const selectedVersion =
      Number(formData.get("selectedVersion")) || undefined;
    const image = formData.get("image") as File | null;
    const prompt = formData.get("prompt") as string | null;
    console.log("prompt", prompt);
    const {
      messagesFromDatabase,
      framework,
      artifactCode,
      updatedPrompt,
      updatedImage,
    } = await validateRequest(id, image, prompt, selectedVersion);

    const { messagesToOpenAI: messages } = await buildMessagesToOpenAi(
      messagesFromDatabase,
      updatedPrompt,
      updatedImage,
      selectedVersion,
    );
    console.log("messages", messages);
    const stream = streamText({
      messages,
      model: anthropicModel("claude-3-7-sonnet-latest"),
      system:
        framework === Framework.HTML
          ? htmlSystemPrompt(
              messagesFromDatabase.length === 1
                ? messagesFromDatabase[0]?.theme
                : null,
            )
          : systemPrompt(framework as Framework, artifactCode),
      toolChoice: "none",
      maxTokens: 8192,
      onFinish: async ({ text, usage, finishReason }) => {
        await updateDataAfterCompletion(
          id,
          text,
          updatedPrompt,
          usage,
          updatedImage,
          finishReason,
        );
      },
    });

    return stream.toTextStreamResponse();
  } catch (error: unknown) {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

const buildMessagesToOpenAi = async (
  messages: Tables<"messages">[],
  updatedPrompt: string,
  updatedImage: string | null,
  selectedVersion?: number,
) => {
  // Filter messages based on selectedVersion if provided
  const filteredMessages =
    selectedVersion !== undefined
      ? messages.filter((m) => m.version <= selectedVersion)
      : messages;

  // Limiter le nombre de messages à envoyer à l'API (par exemple, les 10 derniers)
  const maxMessagesToSend = 6;
  const limitedMessages =
    filteredMessages.length > maxMessagesToSend
      ? filteredMessages.slice(-maxMessagesToSend)
      : filteredMessages;

  // Map messages to OpenAI format
  const messagesToOpenAI = limitedMessages.map((m) => {
    if (m.role === "user" && m.prompt_image) {
      return {
        role: m.role as "user" | "assistant" | "tool" | "system",
        content: [
          {
            type: "text",
            text:
              limitedMessages.length === 1
                ? `NEW PROJECT TAILWIND AI - ${m.content}`
                : m.content,
          },
          {
            type: "image",
            image: new URL(`${storageUrl}/${m.prompt_image}`),
          },
        ],
      };
    }

    return {
      role: m.role as "user" | "assistant" | "tool" | "system",
      content:
        limitedMessages.length === 1 && m.role === "user"
          ? `NEW PROJECT TAILWIND AI - ${m.content}`
          : m.content,
    };
  }) as CoreMessage[];

  messagesToOpenAI.push({
    role: "user",
    content: updatedImage
      ? [
          {
            type: "text",
            text: updatedPrompt,
          },
          {
            type: "image",
            image: new URL(`${storageUrl}/${updatedImage}`),
          },
        ]
      : updatedPrompt,
  });

  return { messagesToOpenAI };
};

const validateRequest = async (
  id: string,
  image: File | null,
  prompt: string | null,
  selectedVersion?: number,
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Could not get user");
  // Fetch chat data
  const chat = await fetchChatById(id);
  if (!chat) throw new Error("Could not get chat data");

  // Validate user
  if (chat.user?.id !== user.id) {
    throw new Error("User is not authorized to modify chat");
  }
  const messagesFromDatabase = await fetchMessagesByChatId(id);
  if (!messagesFromDatabase) throw new Error("Could not get chat messages");

  // Check subscription
  const subscription = await getSubscription();

  if (subscription) {
    // Calculate the start of the current billing month based on current_period_start
    const currentPeriodStart = new Date(subscription.current_period_start);

    // Vérifier la limite quotidienne
    const { count } = await supabase
      .from("messages")
      .select("*, chats!inner(*)", { count: "exact", head: true })
      .eq("chats.user_id", user.id)
      .gte("created_at", formatToTimestamp(currentPeriodStart)); // Use currentDayStart for daily limit

    const maxMessagesPerPeriod = getMaxMessagesPerPeriod(subscription);
    if (count && count >= maxMessagesPerPeriod) {
      throw new Error("limit-exceeded");
    }
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Vérifier la limite mensuelle pour les abonnés
    const { count } = await supabase
      .from("messages")
      .select("*, chats!inner(*)", { count: "exact", head: true })
      .eq("chats.user_id", user.id)
      .gte("created_at", formatToTimestamp(today));

    if (count && count >= TRIAL_PLAN_MESSAGES_PER_DAY) {
      throw new Error("limit-exceeded");
    }
  }

  if (
    messagesFromDatabase.filter((m) => m.role === "assistant")?.length > 200
  ) {
    throw new Error("You can't have more than 200 versions");
  }

  if (!subscription && image) {
    throw new Error("payment-required-for-image");
  }

  const lastUserMessage =
    selectedVersion !== undefined
      ? await fetchUserMessageByChatIdAndVersion(id, selectedVersion)
      : await fetchLastUserMessageByChatId(id);
  if (!lastUserMessage) throw new Error("No last user message");

  let updatedPrompt = prompt || "";
  let updatedImage = null;

  if (!prompt) {
    updatedPrompt = lastUserMessage.content || "";
  }

  if (image) {
    const { data: imageData, error: imageError } = await supabase.storage
      .from("images")
      .upload(`${Date.now()}-${user?.id}`, image);
    if (imageError) {
      throw new Error("Failed to upload image");
    }

    updatedImage = imageData?.path;
  }

  if (lastUserMessage.version === -1 && lastUserMessage.prompt_image) {
    updatedImage = lastUserMessage.prompt_image;
  }

  return {
    messagesFromDatabase,
    subscription,
    framework: chat.framework,
    artifactCode: chat.artifact_code,
    updatedPrompt,
    updatedImage,
  };
};

const updateDataAfterCompletion = async (
  chatId: string,
  text: string | undefined,
  updatedPrompt: string,
  usage: LanguageModelUsage,
  updatedImage: string | null | undefined,
  finishReason?: string,
) => {
  const supabase = await createClient();

  const chat = await fetchChatById(chatId);
  if (!chat) return console.error("Could not get chat data");

  const lastUserMessage = await fetchLastUserMessageByChatId(chatId);
  if (!lastUserMessage) return console.error("Could not get chat messages");
  const newMessages = [];

  if (!text) return console.error("No completion");

  const version = lastUserMessage.version + 1;
  const artifactCode = getUpdatedArtifactCode(text, chat.artifact_code || "");

  // Fetch current tokens
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
  console.log("currentInputTokens", currentInputTokens);
  console.log("currentOutputTokens", currentOutputTokens);
  // Update with the sum of previous and new tokens
  if (currentChatData.title) {
    await supabase
      .from("chats")
      .update({
        artifact_code: artifactCode,
        input_tokens: currentInputTokens + usage.promptTokens,
        output_tokens: currentOutputTokens + usage.completionTokens,
      })
      .eq("id", chatId);
  } else {
    await supabase
      .from("chats")
      .update({
        artifact_code: artifactCode,
        title: extractTitle(text),
        input_tokens: currentInputTokens + usage.promptTokens,
        output_tokens: currentOutputTokens + usage.completionTokens,
      })
      .eq("id", chatId);
  }

  if (version > 0) {
    newMessages.push({
      chat_id: chatId,
      screenshot: null,
      version,
      content: updatedPrompt,
      role: "user",
      prompt_image: updatedImage,
      input_tokens: usage.promptTokens,
    });
  } else {
    await supabase
      .from("messages")
      .update({ version, input_tokens: usage.promptTokens })
      .eq("chat_id", chatId)
      .eq("version", -1);
  }

  const theme = extractDataTheme(text);

  // If we have a finishReason, add a special marker at the end of the content
  // that the client can detect and remove
  let content = text;
  if (finishReason === "length" || finishReason === "error") {
    content = `${text}\n\n<!-- FINISH_REASON: ${finishReason} -->`;
  }
  newMessages.push({
    chat_id: chatId,
    screenshot: null,
    version,
    content: content,
    theme,
    role: "assistant",
    output_tokens: usage.completionTokens,
  });

  const { data: newMessagesData, error: newMessagesError } = await supabase
    .from("messages")
    .insert(newMessages)
    .eq("chat_id", chatId);
  if (newMessagesError) {
    console.error("Error inserting new messages:", newMessagesError);
  }
  console.log("newMessagesData", newMessagesData);

  after(async () => {
    if (chat.framework === Framework.HTML) {
      await takeScreenshot(chatId, version, theme, Framework.HTML);
      return;
    }
    await buildComponent(chatId, version);
  });
};
