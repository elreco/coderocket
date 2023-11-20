import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { cookies } from "next/headers";
import OpenAI from "openai";

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

  const messagesFromDatabase = chat.messages;

  const messagesToOpenAi: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [];

  if (messagesFromDatabase.length > 2) {
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
      content: prompt,
      role: "user",
    });
  } else {
    messagesToOpenAi.push(...messagesFromDatabase);
  }

  try {
    const response = await openai.chat.completions.create({
      messages: messagesToOpenAi,
      model: "ft:gpt-3.5-turbo-1106:personal::8LBkKNVC",
      stream: true,
      temperature: 0.5,
    });
    // https://github.com/vercel-labs/ai-chatbot
    const stream = OpenAIStream(response, {
      onCompletion: async (completion: string) => {
        await supabase
          .from("chats")
          .update({
            messages: [
              ...messagesFromDatabase,
              {
                content: prompt,
                role: "user",
              },
              {
                content: completion,
                role: "assistant",
              },
            ],
          })
          .eq("id", id);
      },
    });
    return new StreamingTextResponse(stream);
  } catch (e) {
    return Response.json({ code: 500, error: "server error" });
  }
}
