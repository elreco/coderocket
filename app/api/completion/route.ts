export const maxDuration = 300;

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { cookies } from "next/headers";
import OpenAI from "openai";

import { getSubscription } from "@/app/supabase-server";
import { Database } from "@/types_db";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI || "",
});

export async function POST(req: Request) {
  // Function to build messages for OpenAI
  const supabase = createRouteHandlerClient<Database>({ cookies });

  // Fetch user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Could not get user");

  // Extract prompt and id from request
  const { prompt, id } = (await req.json()) as { prompt: string; id: string };

  // Fetch chat data
  const { data } = await supabase.from("chats").select().eq("id", id);
  if (!data?.length) throw new Error("Could not get chat");
  const chat = data[0];

  // Validate user
  if (chat.user_id !== user.id) {
    throw new Error("User is not authorized to modify chat");
  }

  const imageUrl = chat.prompt_image;
  const messagesFromDatabase = [...chat.messages];

  // Check subscription
  const subscription = await getSubscription();
  if (
    (!subscription || subscription.status !== "active") &&
    messagesFromDatabase &&
    messagesFromDatabase.length > 10
  ) {
    throw new Error("payment required");
  }

  // Fetch HTML content
  const { data: blobContent, error } = await supabase.storage
    .from("featured")
    .download("html-gen.md");
  if (error) throw new Error("Could not get HTML file");
  const contentMd = await blobContent.text();

  // Build messages for OpenAI
  const messagesToOpenAi = await buildMessagesToOpenAi(
    contentMd,
    messagesFromDatabase,
    prompt,
    imageUrl,
  );

  try {
    // Request OpenAI completion
    const response = await openai.chat.completions.create({
      messages: messagesToOpenAi,
      model: "gpt-4o",
      temperature: 0,
      stream: true,
    });

    // Stream response and update chat messages
    const stream = OpenAIStream(response, {
      onCompletion: async (completion: string) => {
        const messages = [...chat.messages];
        if (messages.length > 1) {
          messages.push(
            { content: prompt, role: "user" },
            { content: completion, role: "assistant" },
          );
        } else {
          messages.push({ content: completion, role: "assistant" });
        }
        await supabase.from("chats").update({ messages }).eq("id", id);
      },
    });

    return new StreamingTextResponse(stream);
  } catch (e) {
    console.log(e);
    return Response.json({ code: 500, error: "server error" });
  }
}

const buildMessagesToOpenAi = async (
  contentMd: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
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
          url: `https://jojdwiugelqhcajbccxn.supabase.co/storage/v1/object/public/images/${imageUrl}`,
        },
      },
    ];
  }

  return messagesToOpenAI;
};
