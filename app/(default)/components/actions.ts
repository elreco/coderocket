"use server";

import { addDays, format } from "date-fns";
import { nanoid } from "nanoid";
import { after } from "next/server";

import { getSubscription } from "@/app/supabase-server";
import {
  Framework,
  TRIAL_PLAN_MESSAGES_PER_DAY,
  defaultTheme,
  getMaxMessagesPerPeriod,
} from "@/utils/config";
import { formatToTimestamp } from "@/utils/date";
import { defaultArtifactCode } from "@/utils/default-artifact-code";
import { createClient } from "@/utils/supabase/server";

import { buildComponent } from "./[slug]/actions";

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
    input_tokens,
    output_tokens,
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

export const fetchMessagesByChatId = async (
  chatId: string,
  isAscending: boolean = true,
) => {
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
    .order("version", { ascending: isAscending })
    .order("role", { ascending: false });
  return data;
};

export const fetchChatsByUserId = async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chats")
    .select(
      `
      *,
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
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

export const fetchLastAssistantMessageByChatId = async (
  chatId: string,
  checkBuilt: boolean = false,
) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .order("version", { ascending: false })
    .limit(1)
    .single();
  if (data && !data?.is_built && checkBuilt) {
    after(async () => {
      await buildComponent(chatId, data.version, true);
    });
  }
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
  const isVisible = formData.get("isVisible");
  const theme = formData.get("theme")?.toString() || defaultTheme;
  const frameworkInput = formData.get("framework")?.toString() || "react";
  const framework = Object.values(Framework).includes(
    frameworkInput as Framework,
  )
    ? frameworkInput
    : Framework.HTML;
  const is_private = isVisible === "false";

  if (!subscription && is_private) {
    return {
      error: {
        title: "You have reached the limit of your free plan.",
        description:
          "Please upgrade to continue. Go to My Account to see your usage.",
      },
    };
  }

  if (!subscription) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Vérifier la limite mensuelle pour les abonnés
    const { count } = await supabase
      .from("messages")
      .select("*, chats!inner(*)", { count: "exact", head: true })
      .eq("chats.user_id", user.id)
      .gte("created_at", formatToTimestamp(today));

    if (count && count >= TRIAL_PLAN_MESSAGES_PER_DAY) {
      return {
        error: {
          title: "Daily message limit reached",
          description: `You have reached your limit of ${TRIAL_PLAN_MESSAGES_PER_DAY} messages for today. Your limit will reset tomorrow (${format(
            addDays(today, 1),
            "d MMMM yyyy",
          )}). Upgrade to a paid plan to continue.`,
        },
      };
    }
  } else {
    // Calculate the start of the current billing month based on current_period_start
    const currentPeriodStart = new Date(subscription.current_period_start);

    // Vérifier la limite mensuelle pour les abonnés
    const { count } = await supabase
      .from("messages")
      .select("*, chats!inner(*)", { count: "exact", head: true })
      .eq("chats.user_id", user.id)
      .gte("created_at", formatToTimestamp(currentPeriodStart));

    const maxMessagesPerPeriod = getMaxMessagesPerPeriod(subscription);

    if (count && count >= maxMessagesPerPeriod) {
      const resetDate = format(
        new Date(
          currentPeriodStart.getFullYear(),
          currentPeriodStart.getMonth() + 1,
          1,
        ),
        "d MMMM yyyy", // Format lisible, par exemple, "1er novembre 2023"
      );

      return {
        error: {
          title: "You have reached the limit of your plan",
          description: `You have reached your limit of ${maxMessagesPerPeriod} messages for this ${subscription.prices?.interval}. This limit will reset on ${resetDate}. Go to My Account to see your usage.`,
        },
      };
    }
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
        framework,
        artifact_code:
          defaultArtifactCode[framework as keyof typeof defaultArtifactCode],
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

export const getHTMLChatsFromUser = async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) throw Error("Could not get user");
  const { data } = await supabase
    .rpc("get_all_components")
    .eq("user_id", user.id)
    .eq("framework", Framework.HTML)
    .limit(99);

  return data;
};

export const getReactChatsFromUser = async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) throw Error("Could not get user");
  const { data } = await supabase
    .rpc("get_all_components")
    .eq("user_id", user.id)
    .eq("framework", "react")
    .limit(99);

  return data;
};

export const getVueChatsFromUser = async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) throw Error("Could not get user");
  const { data } = await supabase
    .rpc("get_all_components")
    .eq("user_id", user.id)
    .eq("framework", "vue")
    .limit(99);

  return data;
};

export const getFeaturedChats = async () => {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_all_components")
    .is("is_featured", true)
    .limit(50);
  return data;
};

export const getAllReactPublicChats = async () => {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_all_components")
    .is("is_private", false)
    .eq("framework", "react")
    .not("last_assistant_message", "is", null)
    .limit(24);
  return data;
};

export const getAllVuePublicChats = async () => {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_all_components")
    .is("is_private", false)
    .eq("framework", "vue")
    .not("last_assistant_message", "is", null)
    .limit(24);

  return data;
};

export const getAllHTMLPublicChats = async () => {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_all_components")
    .is("is_private", false)
    .not("last_assistant_message", "is", null)
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
