"use server";

import { getSubscription } from "@/app/supabase-server";
import { sanitizePrompt } from "@/lib/utils";
import { maxPromptLength } from "@/utils/config";
import { createClient } from "@/utils/supabase/server";

export const fetchChatById = async (id: string) => {
  const supabase = await createClient();
  const chatsWithUser = supabase
    .from("chats")
    .select(
      `
    id,
    created_at,
    is_private,
    is_featured,
    messages,
    prompt_image,
    user_id,
    user:users (*)
`,
    )
    .eq("id", id)
    .single();

  const { data, error } = await chatsWithUser;
  if (error) throw error;

  return data;
};

export const fetchMessagesByChatId = async (chatId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select(
      `
      *,
      chats (
        user:users (*),
        prompt_image
      )
    `,
    )
    .eq("chat_id", chatId)
    .order("version", { ascending: true })
    .order("role", { ascending: false });
  return data;
};

export const fetchFirstUserMessageByChatId = async (chatId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select()
    .eq("chat_id", chatId)
    .eq("role", "user")
    .order("version", { ascending: true })
    .limit(1)
    .single();
  return data;
};

export const fetchLastAssistantMessageByChatId = async (chatId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select()
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .order("version", { ascending: false })
    .limit(1)
    .single();
  return data;
};

export const fetchLastUserMessageByChatId = async (chatId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select()
    .eq("chat_id", chatId)
    .eq("role", "user")
    .order("version", { ascending: false })
    .limit(1)
    .single();
  return data;
};

export const fetchAssistantMessageByChatIdAndVersion = async (
  chatId: string,
  version: number,
) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select()
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .eq("version", version)
    .single();
  return data;
};

export const fetchUserMessageByChatIdAndVersion = async (
  chatId: string,
  version: number,
) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select()
    .eq("chat_id", chatId)
    .eq("role", "user")
    .eq("version", version)
    .single();
  return data;
};

export const createChat = async (prompt: string, formData: FormData) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user?.id) {
    return {
      error: {
        title: "You must be logged in to create a component",
        description: "Please login or create an account to continue.",
      },
    };
  }

  const subscription = await getSubscription();
  const { data: existingChats } = await supabase
    .from("chats")
    .select()
    .eq("user_id", user?.id);
  const isVisible = formData.get("isVisible");
  const is_private = isVisible === "false";

  if (!subscription && is_private) {
    return {
      error: {
        title: "You have reached the limit of your free plan",
        description: "Please upgrade to continue.",
      },
    };
  }

  if (!subscription && existingChats && existingChats?.length > 0) {
    return {
      error: {
        title: "You have reached the limit of your free plan",
        description: "Please upgrade to continue.",
      },
    };
  }

  // Nettoyage de la prompt
  const sanitizedPrompt = sanitizePrompt(prompt);

  if (sanitizedPrompt.length > maxPromptLength) {
    return {
      error: {
        title: "Prompt is too long",
        description:
          "Tailwind AI is meant to generate components from simple instructions.",
      },
    };
  }

  let imageUrl = null;
  const image = formData.get("file") as File;
  if (!subscription && image) {
    return {
      error: {
        title: "You can't upload images with a free plan",
        description: "Please upgrade to continue.",
      },
    };
  }
  if (image) {
    const { data: imageData, error: imageError } = await supabase.storage
      .from("images")
      .upload(`${Date.now()}-${user?.id}`, image);
    if (imageError) {
      return {
        error: {
          title: "Failed to upload image",
          description: "Please try again later.",
        },
      };
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
        messages: [],
      },
    ])
    .select()
    .single();
  if (!data) {
    return {
      error: {
        title: "Failed to create chat",
        description: "Please try again later.",
      },
    };
  }

  await supabase.from("messages").insert({
    chat_id: data.id,
    role: "user",
    content: sanitizedPrompt,
    version: -1,
  });

  return { id: data.id };
};

export const getChatsFromUser = async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) throw Error("Could not get user");
  const { data } = await supabase
    .rpc("get_components")
    .eq("user_id", user.id)
    .limit(100);

  return data;
};

export const getFeaturedChats = async () => {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_components")
    .is("is_featured", true)
    .limit(50);
  return data;
};

export const getAllPublicChats = async () => {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_components")
    .is("is_private", false)
    .limit(24);

  return data;
};
