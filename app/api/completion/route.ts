import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";

import { getSubscription } from "@/app/supabase-server";
import { Database } from "@/types_db";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI || "",
});

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw Error("Could not get user");

  const { prompt, id } = (await req.json()) as {
    prompt: string;
    id: string;
  };

  const { data } = await supabase.from("chats").select().eq("id", id);

  if (!data?.length) throw Error("Could not get chat");
  const chat = data[0];
  if (chat.user_id !== user.id) {
    throw Error("User is not authorized to modify chat");
  }

  const imageUrl = chat.prompt_image;

  const messagesFromDatabase = [...chat.messages];
  const messages = [...chat.messages];

  const subscription = await getSubscription();
  if (
    (!subscription || subscription.status !== "active") &&
    messagesFromDatabase &&
    messagesFromDatabase?.length > 11
  ) {
    throw new Error("payment required");
  }

  let messagesToOpenAi = chat.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  if (messagesFromDatabase.length > 2) {
    messagesToOpenAi = [];
    messagesToOpenAi.push(messagesFromDatabase[0]); // system
    messagesToOpenAi.push(messagesFromDatabase[1]); // user
    const lastAssistantMessage = messagesFromDatabase
      .slice()
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistantMessage) {
      messagesToOpenAi.push(lastAssistantMessage);
    }
    messagesToOpenAi.push({
      content: `Previously you already implemented this code, use it as a reference and meet my new requirements: ${prompt}`,
      role: "user",
    });
  } else {
    if (imageUrl) {
      messagesToOpenAi[1].content = [
        {
          type: "text",
          text: messagesFromDatabase[1].content as string,
        },
        {
          type: "image_url",
          image_url: {
            url: `https://jojdwiugelqhcajbccxn.supabase.co/storage/v1/object/public/images/${imageUrl}`,
          },
        },
      ];
    }
  }
  try {
    const response = await openai.chat.completions.create({
      messages: messagesToOpenAi,
      model: "gpt-4o",
      temperature: 0,
      stream: true,
      max_tokens: 3000,
    });
    const stream = OpenAIStream(response, {
      onCompletion: async (completion: string) => {
        console.log("messages 2", messages[1]);
        if (messages.length > 2) {
          messages.push(
            {
              content: prompt,
              role: "user",
            },
            {
              content: completion,
              role: "assistant",
            },
          );
        } else {
          messages.push({
            content: completion,
            role: "assistant",
          });
        }
        console.log("messages", messages);
        console.log("messages", prompt);
        await supabase
          .from("chats")
          .update({
            messages,
          })
          .eq("id", id);
      },
    });

    return new StreamingTextResponse(stream);
  } catch (e) {
    console.log(e);
    return Response.json({ code: 500, error: "server error" });
  }
}
