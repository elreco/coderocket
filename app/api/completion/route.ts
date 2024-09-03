export const maxDuration = 300;

import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";

import { getSubscription } from "@/app/supabase-server";
import { captureScreenshot } from "@/utils/capture-screenshot";
import { maxPromptLength, openAIModel, storageUrl } from "@/utils/config";
import { getURL } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI || "",
});

export async function POST(req: Request) {
  // Extract prompt and id from request
  const { prompt, id } = (await req.json()) as { prompt: string; id: string };

  try {
    const { messagesFromDatabase, imageUrl, contentMd } = await validateRequest(
      id,
      prompt,
    );

    // Build messages for OpenAI
    const messages = await buildMessagesToOpenAi(
      contentMd,
      messagesFromDatabase,
      prompt,
      imageUrl,
    );

    // Request OpenAI completion
    const response = await openai.chat.completions.create({
      messages,
      model: openAIModel,
      temperature: 0,
      stream: true,
    });

    // Stream response and update chat messages
    const stream = OpenAIStream(response, {
      onCompletion: async (completion: string) => {
        try {
          await updateDataAfterCompletion(id, completion, prompt);
        } catch (e) {
          console.error(e);
        }
      },
    });

    return new StreamingTextResponse(stream);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return new Response(e.message, {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

const buildMessagesToOpenAi = async (
  contentMd: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: readonly any[],
  prompt: string,
  imageUrl?: string | null | undefined,
) => {
  const initialSystemMessage = { role: "system", content: contentMd };

  // Construct base message array starting with system message
  let messagesToOpenAI = [initialSystemMessage, ...messages];

  // Handling the scenario where there's more than one message in the database
  if (messages.length > 1) {
    // Retrieve the first user message and the last assistant message
    const userMessage = messages.find((message) => message.role === "user");
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    // Reconstruct messages with relevant user and assistant messages
    messagesToOpenAI = [initialSystemMessage];
    if (userMessage) messagesToOpenAI.push(userMessage);
    if (lastAssistantMessage) messagesToOpenAI.push(lastAssistantMessage);

    // Adding new user message regarding previous implementation
    messagesToOpenAI.push({
      role: "user",
      content: `Previously you already implemented this code, use it as a reference and meet my new requirements: ${prompt}`,
    });
  } else if (imageUrl) {
    // Handling image URL integration if there is an image
    messagesToOpenAI[1].content = [
      {
        type: "text",
        text: messages[0].content as string,
      },
      {
        type: "image_url",
        image_url: {
          url: `${storageUrl}/${imageUrl}`,
        },
      },
    ];
  }

  return messagesToOpenAI;
};

const validateRequest = async (id: string, prompt: string) => {
  const supabase = createClient();
  // Fetch user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Could not get user");

  // Fetch chat data
  const { data } = await supabase.from("chats").select().eq("id", id);
  if (!data?.length) throw new Error("Could not get chat data");
  const chat = data[0];

  // Validate user
  if (chat.user_id !== user.id) {
    throw new Error("User is not authorized to modify chat");
  }

  const messagesFromDatabase = [...chat.messages];
  // Check subscription
  const subscription = await getSubscription();
  if (
    !subscription &&
    messagesFromDatabase &&
    messagesFromDatabase.filter((m) => m.role === "assistant")?.length > 3
  ) {
    throw new Error("payment-required");
  }

  const imageUrl = chat.prompt_image;

  if (!subscription && imageUrl) {
    throw new Error("payment-required");
  }

  if (messagesFromDatabase.filter((m) => m.role === "assistant")?.length > 200) {
    throw new Error("You can't have more than 200 versions");
  }

  // Prompt validation
  if (prompt.length > maxPromptLength) {
    throw new Error("Prompt length is too long");
  }

  // Fetch HTML content
  const { data: blobContent, error } = await supabase.storage
    .from("featured")
    .download("html-gen.md");
  if (error) throw new Error("Could not get AI Model file. Please try again");
  const contentMd = await blobContent.text();

  return {
    messagesFromDatabase,
    imageUrl,
    contentMd,
  };
};

const updateDataAfterCompletion = async (
  id: string,
  completion: string,
  prompt: string,
) => {
  const supabase = createClient();

  const { data: chatData } = await supabase.from("chats").select().eq("id", id);

  if (chatData) {
    const newMessages = [...chatData[0].messages];
    if (newMessages.length > 1) {
      newMessages.push(
        { content: prompt, role: "user" },
        {
          content: completion,
          role: "assistant",
        },
      );
    } else {
      newMessages.push({
        content: completion,
        role: "assistant",
      });
    }

    await supabase.from("chats").update({ messages: newMessages }).eq("id", id);

    const screenshot = await captureScreenshot(`${getURL()}content/${id}`);

    const { error, data } = await supabase.storage
      .from("chat-images")
      .upload(`${id}/${Date.now()}`, screenshot, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });
    if (!error) {
      const { data: imageData } = supabase.storage
        .from("chat-images")
        .getPublicUrl(data.path);

      newMessages[newMessages.length - 1].screenshot = imageData.publicUrl;
      await supabase
        .from("chats")
        .update({ messages: newMessages })
        .eq("id", id);
    } else {
      throw new Error("Failed to upload image to Supabase: " + error.message);
    }
  }
};
