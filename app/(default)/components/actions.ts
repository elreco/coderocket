"use server";

import { nanoid } from "nanoid";

import { getSubscription } from "@/app/supabase-server";
import { defaultTheme } from "@/utils/config";
import { createClient } from "@/utils/supabase/server";

export const fetchChatById = async (idOrSlug: string) => {
  const supabase = await createClient();

  // Vérifier si idOrSlug est un UUID
  const isUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      idOrSlug,
    );

  const chatsWithUser = supabase
    .from("chats")
    .select(
      `
    id,
    artifact_code,
    created_at,
    is_private,
    is_featured,
    framework,
    prompt_image,
    user_id,
    slug,
    user:users (*)
`,
    )
    .eq(isUuid ? "id" : "slug", idOrSlug)
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
  const theme = formData.get("theme")?.toString() || defaultTheme;
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

  const uniqueSlug = await generateUniqueNanoid();
  const { data } = await supabase
    .from("chats")
    .insert([
      {
        user_id: user.id,
        ...(imageUrl && { prompt_image: imageUrl }),
        is_private,
        slug: uniqueSlug,
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
    theme,
    content: prompt,
    version: -1,
  });

  return { slug: data.slug };
};

export const getChatsFromUser = async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) throw Error("Could not get user");
  const { data } = await supabase
    .rpc("get_components_with_theme_and_slug")
    .eq("user_id", user.id)
    .limit(100);

  return data;
};

export const getFeaturedChats = async () => {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_components_with_theme_and_slug")
    .is("is_featured", true)
    .limit(50);
  return data;
};

export const getAllPublicChats = async () => {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_components_with_theme_and_slug")
    .is("is_private", false)
    .limit(24);

  return data;
};

export const generateUniqueNanoid = async () => {
  const supabase = await createClient();
  let uniqueId;
  let isUnique = false;

  while (!isUnique) {
    uniqueId = nanoid(11);
    const { data } = await supabase
      .from("chats")
      .select("id")
      .eq("slug", uniqueId)
      .single();

    if (!data) {
      isUnique = true;
    }
  }

  return uniqueId;
};
