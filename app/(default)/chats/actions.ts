"use server";

import { redirect } from "next/navigation";

import { getSubscription } from "@/app/supabase-server";
import { createClient } from "@/utils/supabase/server";

import { Chat, ChatProps } from "./types";
export const fetchChat = async (id: string): Promise<ChatProps | null> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("chats")
    .select(
      `
  id,
  created_at,
  messages,
  is_private,
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

  return {
    ...data[0],
    messages,
  };
};

export const createChat = async (prompt: string, formData: FormData) => {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user?.id) throw Error("Could not get user");

  const subscription = await getSubscription();
  const { data: existingChats } = await supabase
    .from("chats")
    .select()
    .eq("user_id", user?.id);
  const isVisible = formData.get("isVisible");
  const is_private = isVisible === "false";

  if (!subscription && is_private) {
    return redirect("pricing?paymentRequired=true");
  }

  if (!subscription && existingChats && existingChats?.length > 0) {
    return redirect("pricing?paymentRequired=true");
  }

  if (prompt.length > 1000) {
    throw Error("Prompt length is too long");
  }

  let imageUrl = null;
  const image = formData.get("file") as File;

  if (image) {
    const { data: imageData, error: imageError } = await supabase.storage
      .from("images")
      .upload(`${Date.now()}-${user?.id}`, image);
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
        is_private,
        messages: [
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

export const getUserChats = async (): Promise<Chat[]> => {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) throw Error("Could not get user");
  const { data } = await supabase
    .rpc("get_chats")
    .eq("user_id", user.id)
    .limit(100);

  if (!data?.length) {
    return [];
  }
  return data;
};

export const getFeaturedChats = async (): Promise<Chat[]> => {
  const supabase = createClient();

  const { data } = await supabase
    .rpc("get_chats")
    .is("is_featured", true)
    .limit(50);
  if (data?.length) {
    return data;
  }
  return [];
};

export const getAllPublicChats = async (): Promise<Chat[]> => {
  const supabase = createClient();

  const { data } = await supabase
    .rpc("get_chats")
    .is("is_private", false)
    .limit(24);
  if (data?.length) {
    return data;
  }

  return [];
};
