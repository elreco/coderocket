export const maxDuration = 300;

import { CoreMessage, streamText } from "ai";

import {
  fetchChatById,
  fetchLastAssistantMessageByChatId,
  fetchLastUserMessageByChatId,
  fetchMessagesByChatId,
} from "@/app/(default)/components/actions";
import { getSubscription } from "@/app/supabase-server";
import { sanitizePrompt } from "@/lib/utils";
import { Tables } from "@/types_db";
import { takeScreenshot } from "@/utils/capture-screenshot";
import {
  anthropicModel,
  defaultTheme,
  maxPromptLength,
  storageUrl,
} from "@/utils/config";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const headers = req.headers;
    const { id, selectedVersion } = JSON.parse(
      headers.get("X-Custom-Header") as string,
    ) as { id: string; selectedVersion: number };
    const { prompt }: { prompt: string } = await req.json();
    if (!prompt) throw new Error("No prompt");

    const { messagesFromDatabase, imageUrl, contentMd, subscription } =
      await validateRequest(id, prompt);
    // Build messages for OpenAI
    const { messagesToOpenAI: messages } = await buildMessagesToOpenAi(
      messagesFromDatabase,
      prompt,
      imageUrl,
      selectedVersion,
    );
    const stream = streamText({
      messages,
      model: anthropicModel(
        subscription ? "claude-3-5-sonnet-latest" : "claude-3-5-sonnet-latest",
      ),
      system: contentMd,
      toolChoice: "none",
      maxTokens: 8192,
      onFinish: async ({ text }) => {
        try {
          await updateDataAfterCompletion(id, text, prompt);
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
  // Filtrer les messages en fonction de selectedVersion si fourni
  const filteredMessages =
    selectedVersion !== undefined
      ? messages.filter((m) => m.version <= selectedVersion)
      : messages;

  // Limiter aux derniers messages pour obtenir un nombre pair
  const limitedMessages = filteredMessages.slice(-12);

  // Mapper les messages au format requis par OpenAI
  const messagesToOpenAI = limitedMessages.map((m) => {
    return {
      role: m.role as "user" | "assistant" | "tool" | "system",
      content: m.content,
    };
  }) as CoreMessage[];

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
        {
          type: "image",
          image: new URL(`${storageUrl}/${imageUrl}`),
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

const validateRequest = async (id: string, prompt: string) => {
  const supabase = await createClient();
  // Fetch user
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
  if (
    !subscription &&
    messagesFromDatabase &&
    messagesFromDatabase.filter((m) => m.role === "assistant")?.length > 3
  ) {
    throw new Error("payment-required", {
      cause: "You need to be subscribed to use this feature",
    });
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

  const sanitizedPrompt = sanitizePrompt(prompt);

  if (sanitizedPrompt.length > maxPromptLength) {
    throw new Error("Prompt length is too long");
  }

  // Fetch HTML content
  const { data: blobContent, error } = await supabase.storage
    .from("featured")
    .download("system-html.txt");
  if (error) throw new Error("Could not get AI Model file. Please try again");
  const contentMd = await blobContent.text();

  return {
    messagesFromDatabase,
    imageUrl,
    contentMd,
    subscription,
  };
};

const updateDataAfterCompletion = async (
  chatId: string,
  text: string | undefined,
  prompt: string,
) => {
  const supabase = await createClient();

  const lastUserMessage = await fetchLastUserMessageByChatId(chatId);
  if (!lastUserMessage) return console.error("Could not get chat messages");
  const newMessages = [];

  if (!text) return console.error("No completion");

  const version = lastUserMessage.version + 1;

  if (lastUserMessage.version === -1) {
    lastUserMessage.version = 0;
    await supabase
      .from("messages")
      .update({ version: 0 })
      .eq("id", lastUserMessage.id);
  } else {
    newMessages.push({
      chat_id: chatId,
      screenshot: null,
      version: lastUserMessage.version + 1,
      content: prompt,
      role: "user",
    });
  }
  const lastAssistantMessage = await fetchLastAssistantMessageByChatId(chatId);
  const theme = lastAssistantMessage?.theme || defaultTheme;
  newMessages.push({
    chat_id: chatId,
    screenshot: null,
    version,
    content: text,
    theme,
    role: "assistant",
  });

  await supabase.from("messages").insert(newMessages).eq("chat_id", chatId);

  takeScreenshot(chatId, version, theme).catch((error) => {
    console.error("Error taking screenshot:", error);
  });
};
