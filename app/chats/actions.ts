"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient, getSession } from "@/app/supabase-server";

import { ChatMessage, ChatProps } from "./types";

export const fetchChat = async (id: string): Promise<ChatProps | null> => {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase.from("chats").select().eq("id", id);

  if (!data?.length) {
    return null;
  }

  const messages = data?.length ? data[0]?.messages : [];

  let assistantVersion = -1;
  const filteredMessages: ChatMessage[] = messages.reduce(
    (acc: ChatMessage[], m, index) => {
      if (m.content === null) {
        m.content = "";
      }

      const message = {
        ...m,
        id: `message-${index}`,
        version: m.role === "assistant" ? ++assistantVersion : -1,
      };

      acc.push(message);
      return acc;
    },
    [],
  );

  return {
    ...data[0],
    messages: filteredMessages,
  };
};

export const createChat = async (prompt: string) => {
  const session = await getSession();
  const supabase = createServerSupabaseClient();
  const user = session?.user;

  if (!user) throw Error("Could not get user");

  const { data } = await supabase
    .from("chats")
    .insert([
      {
        user_id: user.id,
        messages: [
          {
            role: "system",
            content:
              'Act as a Tailwind CSS v3 component generator and comply with these directives: Supply only the raw component code, eliminating head tags, doctype, and HTML. Refrain from adding explanations, placeholders, or comments. For any imagery or video, default to Lorem Picsum. If you need icons or svg, never use custom svgs or icons, always use Icons8 https://icons8.com/ or Heroicons icons from: https://heroicons.com/, get the svg from here https://github.com/tailwindlabs/heroicons/tree/master/src/24/solid and add it like that: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /> </svg> or that <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /> </svg>;do not incorporate other SVGs or other icon formats. Provide comprehensive code for each component. If a prompt does not relate to Tailwind component generation, or is ambiguous, generate a Tailwind card component with the following structure:<div class="flex mx-10 items-center justify-center h-screen"><div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative shadow-lg"><div class="flex items-center"><div class="flex-shrink-0"><span class="text-red-500"><i class="fas fa-exclamation-circle"></i></span></div><div class="ml-3"><strong class="font-bold">Error:</strong><span class="block sm:inline"> I\'m sorry, but I cannot assist with [TOPIC]. My purpose is to generate Tailwind components. If you have any coding-related prompts, feel free to ask.</span></div></div></div></div>',
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      },
    ])
    .select();
  if (!data?.length) {
    return null;
  }
  const chat = data[0];
  return redirect(`/chats/${chat.id}`);
};

export const getUserChats = async () => {
  const session = await getSession();
  const supabase = createServerSupabaseClient();
  const user = session?.user;

  if (!user) throw Error("Could not get user");

  const { data } = await supabase.rpc("get_chats").eq("user_id", user.id);
  if (!data?.length) {
    return null;
  }
  return data;
};
