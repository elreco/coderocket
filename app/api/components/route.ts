export const maxDuration = 300;
import { CoreMessage, LanguageModelUsage, streamText } from "ai";
import { after } from "next/server";

import {
  fetchChatById,
  fetchChatsByUserId,
  fetchLastUserMessageByChatId,
  fetchMessagesByChatId,
} from "@/app/(default)/components/actions";
import { getSubscription } from "@/app/supabase-server";
import { Tables } from "@/types_db";
import { takeScreenshot } from "@/utils/capture-screenshot";
import {
  extractDataTheme,
  getUpdatedArtifactCode,
  hasArtifacts,
} from "@/utils/completion-parser";
import {
  Framework,
  MAX_GENERATIONS,
  MAX_ITERATIONS,
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
    const headers = req.headers;
    const { id, selectedVersion } = JSON.parse(
      headers.get("X-Custom-Header") as string,
    ) as { id: string; selectedVersion: number };
    const { prompt }: { prompt: string } = await req.json();
    if (!prompt) throw new Error("No prompt");

    const { messagesFromDatabase, imageUrl, framework } =
      await validateRequest(id);

    // const enhancedPrompt = await promptEnhancer(prompt);
    // Build messages for OpenAI
    const { messagesToOpenAI: messages } = await buildMessagesToOpenAi(
      messagesFromDatabase,
      prompt,
      imageUrl,
      selectedVersion,
    );
    const model =
      imageUrl && messagesFromDatabase.length === 1
        ? "claude-3-5-sonnet-latest"
        : "claude-3-5-haiku-latest";
    console.log("model", model);
    const stream = streamText({
      messages,
      model: anthropicModel(model),
      system:
        framework === Framework.HTML
          ? htmlSystemPrompt(
              messagesFromDatabase.length === 1
                ? messagesFromDatabase[0]?.theme
                : null,
            )
          : systemPrompt(framework as Framework),
      toolChoice: "none",
      maxTokens: 8192,
      onFinish: async ({ text, usage, finishReason }) => {
        if (finishReason === "length") {
          throw new Error("length");
        }
        if (finishReason === "error") {
          throw new Error("error");
        }
        try {
          await updateDataAfterCompletion(id, text, prompt, usage);
        } catch (e) {
          console.error(e);
        }
      },
    });
    return stream.toTextStreamResponse();
  } catch (error: unknown) {
    if (error instanceof Error) {
      return new Response(error.message, {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Internal server error", {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

const buildMessagesToOpenAi = async (
  messages: Tables<"messages">[],
  prompt: string,
  imageUrl?: string | null | undefined,
  selectedVersion?: number,
) => {
  // Filter messages based on selectedVersion if provided
  const filteredMessages =
    selectedVersion !== undefined
      ? messages.filter((m) => m.version <= selectedVersion)
      : messages;

  // Define the maximum number of messages to send
  const maxMessages = 10; // Set your desired limit here

  // Limit the number of messages
  const limitedMessages = filteredMessages.slice(-maxMessages);

  // Map messages to OpenAI format
  const messagesToOpenAI = limitedMessages.map((m) => {
    const content =
      limitedMessages.length === 1 && m.role === "user"
        ? `NEW PROJECT TAILWIND AI - ${m.content}`
        : m.content;

    return {
      role: m.role as "user" | "assistant" | "tool" | "system",
      content,
    };
  }) as CoreMessage[];

  // If it's the first message, add the prefix to the prompt
  if (messagesToOpenAI.length === 1 && imageUrl) {
    messagesToOpenAI[0].content = [
      {
        type: "text",
        text: prompt,
      },
      {
        type: "image",
        image: new URL(`${storageUrl}/${imageUrl}`),
      },
    ];
  }

  if (messagesToOpenAI.length > 1 && imageUrl) {
    messagesToOpenAI.push({
      role: "user",
      content: [
        {
          type: "text",
          text: prompt,
        },
      ],
    });
  }

  if (messagesToOpenAI.length > 1 && !imageUrl) {
    messagesToOpenAI.push({
      role: "user",
      content: prompt,
    });
  }

  return { messagesToOpenAI };
};

const validateRequest = async (id: string) => {
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
  const chatsFromDatabase = await fetchChatsByUserId(user.id);
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
      throw new Error("limit-exceeded", {
        cause: `You have reached your limit of ${maxMessagesPerPeriod} messages for this ${subscription.prices?.interval}. This limit will reset on ${formatToTimestamp(
          new Date(
            currentPeriodStart.getFullYear(),
            currentPeriodStart.getMonth() + 1,
            1,
          ),
        )}. Go to My Account to see your usage.`,
      });
    }
  } else {
    const generations = chatsFromDatabase?.length ?? 0;
    if (generations > MAX_GENERATIONS) {
      throw new Error("payment-required", {
        cause: `You need to be subscribed to generate more than ${MAX_GENERATIONS} components`,
      });
    }

    if (
      messagesFromDatabase &&
      messagesFromDatabase.filter((m) => m.role === "assistant")?.length >=
        MAX_ITERATIONS
    ) {
      throw new Error("payment-required", {
        cause: `You need to be subscribed to generate more than ${MAX_ITERATIONS} versions`,
      });
    }
  }

  const imageUrl = chat.prompt_image;

  if (!subscription && imageUrl) {
    throw new Error("payment-required", {
      cause: "You need to be subscribed to use this feature",
    });
  }

  if (
    messagesFromDatabase.filter((m) => m.role === "assistant")?.length > 200
  ) {
    throw new Error("You can't have more than 200 versions");
  }

  return {
    messagesFromDatabase,
    imageUrl,
    subscription,
    framework: chat.framework,
  };
};

const updateDataAfterCompletion = async (
  chatId: string,
  text: string | undefined,
  prompt: string,
  usage: LanguageModelUsage,
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
    .select("input_tokens, output_tokens")
    .eq("id", chatId)
    .single();

  if (error) {
    console.error("Error fetching current tokens:", error);
    return;
  }

  const currentInputTokens = currentChatData?.input_tokens || 0;
  const currentOutputTokens = currentChatData?.output_tokens || 0;

  // Update with the sum of previous and new tokens
  await supabase
    .from("chats")
    .update({
      artifact_code: artifactCode,
      input_tokens: currentInputTokens + usage.promptTokens,
      output_tokens: currentOutputTokens + usage.completionTokens,
    })
    .eq("id", chatId);

  if (version > 0) {
    newMessages.push({
      chat_id: chatId,
      screenshot: null,
      version,
      content: prompt,
      role: "user",
      input_tokens: usage.promptTokens,
    });
  } else {
    await supabase
      .from("messages")
      .update({ version })
      .eq("chat_id", chatId)
      .eq("version", -1);
  }

  const theme = extractDataTheme(text);
  newMessages.push({
    chat_id: chatId,
    screenshot: null,
    version,
    content: text,
    theme,
    role: "assistant",
    output_tokens: usage.completionTokens,
  });

  await supabase.from("messages").insert(newMessages).eq("chat_id", chatId);
  const hasArtifactResult = hasArtifacts(text);
  if (hasArtifactResult && chat.framework === Framework.HTML) {
    after(async () => {
      await takeScreenshot(chatId, version, theme, Framework.HTML);
    });
  }
};
