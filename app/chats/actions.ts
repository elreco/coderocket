"use server";

import { redirect } from "next/navigation";

import {
  createServerSupabaseClient,
  getSession,
  getSubscription,
} from "@/app/supabase-server";

import { ChatMessage, ChatProps } from "./types";

export const fetchChat = async (id: string): Promise<ChatProps | null> => {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("chats")
    .select(
      `
  id,
  image_url,
  created_at,
  messages,
  user_id (
    id,
    full_name,
    avatar_url
  )
`,
    )
    .eq("id", id);

  if (!data?.length) {
    return null;
  }

  const messages = data?.length ? data[0]?.messages : [];

  let assistantVersion = -1;
  const filteredMessages: ChatMessage[] = messages.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (acc: ChatMessage[], m: any, index: any) => {
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

export const createChat = async (prompt: string, formData: FormData) => {
  const session = await getSession();
  const supabase = createServerSupabaseClient();
  const user = session?.user;

  if (!user) throw Error("Could not get user");

  const subscription = await getSubscription();
  const { data: existingChats } = await supabase
    .from("chats")
    .select()
    .eq("user_id", user.id);

  if (
    (!subscription || subscription.status !== "active") &&
    existingChats &&
    existingChats?.length > 0
  ) {
    // return redirect("pricing?paymentRequired=true");
  }
  const { data: blobContent, error } = await supabase.storage
    .from("featured")
    .download("html-gen.md");

  if (error) throw Error("Could not get html file");
  const contentMd = await blobContent.text();

  let imageUrl = null;
  const image = formData.get("file") as File;
  if (image) {
    const { data: imageData, error: imageError } = await supabase.storage
      .from("images")
      .upload(`${Date.now()}-${image.name}`, image);
    if (imageError) {
      throw Error("Failed to upload image");
    }

    imageUrl = imageData?.path;
  }
  const { data } = await supabase
    .from("chats")
    .insert([
      {
        user_id: user.id,
        ...(imageUrl && { prompt_image: imageUrl }),
        messages: [
          {
            role: "system",
            content: contentMd,
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

  const { data } = await supabase.rpc("get_all_chats").eq("user_id", user.id);
  if (!data?.length) {
    return null;
  }
  return data;
};
