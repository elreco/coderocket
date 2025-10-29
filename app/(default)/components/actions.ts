"use server";

import { format } from "date-fns";
import { nanoid } from "nanoid";
import { after } from "next/server";

import { getSubscription } from "@/app/supabase-server";
import {
  Framework,
  MAX_SEARCH_LENGTH,
  TRIAL_PLAN_MESSAGES_PER_MONTH,
  defaultTheme,
  getMaxMessagesPerPeriod,
  MAX_TOKENS_PER_REQUEST,
  PREMIUM_CHAR_LIMIT,
} from "@/utils/config";
import { defaultArtifactCode } from "@/utils/default-artifact-code";
import { createClient } from "@/utils/supabase/server";
import {
  trackVersionUsage,
  getUserUsageCount,
} from "@/utils/version-usage-tracking";

import { buildComponent } from "./[slug]/actions";

export type GetComponentsReturnType = {
  chat_id: string;
  user_id: string;
  framework: string;
  user_full_name: string;
  user_avatar_url: string;
  is_featured: boolean;
  is_private: boolean;
  created_at: string;
  first_user_message: string;
  title: string;
  likes: number;
  last_assistant_message: string;
  last_assistant_message_theme: string;
  slug: string;
  remix_chat_id: string;
  clone_url?: string;
  user_has_liked?: boolean;
};

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
    *,
    user:users!user_id (*)
`,
    )
    .eq(isUuid ? "id" : "slug", idOrSlug)
    .single();

  const { data } = await chatsWithUser;

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
        prompt_image,
        remix_chat_id
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
  if (data && checkBuilt) {
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

  // Déterminer le prompt à utiliser pour les vérifications de longueur
  const promptToCheck = prompt; // On vérifie la longueur du prompt simple

  if (promptToCheck.length > PREMIUM_CHAR_LIMIT) {
    return {
      error: {
        title: "Prompt is too long",
        description: `Your prompt exceeds the limit of ${PREMIUM_CHAR_LIMIT} characters (approximately ${MAX_TOKENS_PER_REQUEST} tokens). Please shorten it to continue.`,
      },
    };
  }

  const subscription = await getSubscription();
  let subscriptionType = "trial";
  if (subscription) {
    subscriptionType =
      subscription.prices?.products?.name?.toLowerCase() || "trial";
  }
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

  // Vérifier les messages supplémentaires achetés
  const extraMessages = await getExtraMessagesCount(user.id);

  if (!subscription) {
    // Utiliser le premier jour du mois en cours comme période de départ
    const today = new Date();
    const currentPeriodStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );
    const currentPeriodEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1,
    );

    // Use new tracking system for accurate counting
    const usageResult = await getUserUsageCount(
      user.id,
      currentPeriodStart,
      currentPeriodEnd,
    );
    const count = usageResult.success ? usageResult.count : 0;

    if (count >= TRIAL_PLAN_MESSAGES_PER_MONTH) {
      // Si l'utilisateur a des messages supplémentaires, utiliser un message supplémentaire
      if (extraMessages > 0) {
        const decremented = await decrementExtraMessagesCount(user.id);
        if (!decremented) {
          // Définir la date de réinitialisation au premier jour du mois prochain
          const resetDate = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            1,
          );
          return {
            error: {
              title: "Daily message limit reached",
              description: `You have reached your limit of ${TRIAL_PLAN_MESSAGES_PER_MONTH / 2} versions for this month. Your limit will reset next month (${format(
                resetDate,
                "d MMMM yyyy",
              )}). Upgrade to a paid plan or purchase extra messages to continue.`,
            },
          };
        }
      } else {
        // Définir la date de réinitialisation au premier jour du mois prochain
        const resetDate = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1,
        );
        return {
          error: {
            title: "Daily message limit reached",
            description: `You have reached your limit of ${TRIAL_PLAN_MESSAGES_PER_MONTH / 2} versions for this month. Your limit will reset next month (${format(
              resetDate,
              "d MMMM yyyy",
            )}). Upgrade to a paid plan or purchase extra messages to continue.`,
          },
        };
      }
    }
  } else {
    // Calculate the start of the current billing month based on current_period_start
    const currentPeriodStart = new Date(subscription.current_period_start);
    const currentPeriodEnd = new Date(subscription.current_period_end);

    // Use new tracking system for accurate counting
    const usageResult = await getUserUsageCount(
      user.id,
      currentPeriodStart,
      currentPeriodEnd,
    );
    const count = usageResult.success ? usageResult.count : 0;

    const maxMessagesPerPeriod = getMaxMessagesPerPeriod(subscription);

    if (count >= maxMessagesPerPeriod) {
      // Si l'utilisateur a des messages supplémentaires, utiliser un message supplémentaire
      if (extraMessages > 0) {
        const decremented = await decrementExtraMessagesCount(user.id);
        if (!decremented) {
          const resetDate = format(
            new Date(
              currentPeriodStart.getFullYear(),
              currentPeriodStart.getMonth() + 1,
              1,
            ),
            "d MMMM yyyy",
          );

          return {
            error: {
              title: "You have reached the limit of your plan",
              description: `You have reached your limit of ${maxMessagesPerPeriod / 2} versions for this ${subscription.prices?.interval}. This limit will reset on ${resetDate}. Go to My Account to see your usage or purchase extra messages.`,
            },
          };
        }
      } else {
        const resetDate = format(
          new Date(
            currentPeriodStart.getFullYear(),
            currentPeriodStart.getMonth() + 1,
            1,
          ),
          "d MMMM yyyy",
        );

        return {
          error: {
            title: "You have reached the limit of your plan",
            description: `You have reached your limit of ${maxMessagesPerPeriod / 2} versions for this ${subscription.prices?.interval}. This limit will reset on ${resetDate}. Go to My Account to see your usage or purchase extra messages.`,
          },
        };
      }
    }
  }

  let imageUrl = null;
  const filesArray: { url: string; order: number }[] = [];
  const files = formData.getAll("files") as File[];

  if (!subscription && files.length > 0) {
    return {
      error: {
        title: "You can't upload files with a free plan",
        description: "Please upgrade to continue.",
      },
    };
  }

  if (files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const { data: fileData, error: fileError } = await supabase.storage
        .from("images")
        .upload(`${Date.now()}-${i}-${user?.id}`, file);

      if (fileError) {
        return {
          error: {
            title: "Failed to upload file",
            description: "Please try again later.",
          },
        };
      }

      filesArray.push({ url: fileData.path, order: i });
      if (i === 0) {
        imageUrl = fileData.path;
      }
    }
  }

  const uniqueSlug = await generateUniqueNanoid();

  // Extraire l'URL du site cloné à partir du prompt si disponible
  let cloneUrl: string | null = null;
  const cloneWebsiteMatch = prompt.match(
    /Clone this website: (https?:\/\/[^\s]+)/,
  );
  if (cloneWebsiteMatch && cloneWebsiteMatch[1]) {
    cloneUrl = cloneWebsiteMatch[1];
  }

  const { data } = await supabase
    .from("chats")
    .insert([
      {
        user_id: user.id,
        is_private,
        framework,
        artifact_code:
          defaultArtifactCode[framework as keyof typeof defaultArtifactCode],
        slug: uniqueSlug,
        ...(cloneUrl && { clone_url: cloneUrl }),
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

  // Créer un objet pour insérer le message
  const messageData: {
    chat_id: string;
    role: string;
    theme: string;
    prompt_image?: string;
    files?: { url: string; order: number }[];
    content: string;
    version: number;
    subscription_type: string;
  } = {
    chat_id: data.id,
    role: "user",
    theme,
    ...(imageUrl && { prompt_image: imageUrl }),
    ...(filesArray.length > 0 && { files: filesArray }),
    content: prompt,
    version: -1,
    subscription_type: subscriptionType,
  };

  await supabase.from("messages").insert(messageData);

  // Track version usage for accurate pricing
  await trackVersionUsage(user.id, data.id, messageData.version);

  const integrationId = formData.get("integrationId")?.toString();
  if (integrationId) {
    await supabase.from("chat_integrations").insert({
      chat_id: data.id,
      integration_id: integrationId,
      is_enabled: true,
    });
  }

  return { slug: data.slug };
};

/**
 * 🔹 Récupère les composants publics avec pagination et recherche sécurisée.
 */
export const getAllPublicChats = async (
  limit: number = 20,
  offset: number = 0,
  isPopular: boolean = false,
  searchQuery?: string,
  selectedFrameworks?: Framework[],
  isAccountPage?: boolean,
  isLikedPage?: boolean,
) => {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    let query = supabase.rpc("get_components");
    // 🔒 Sécuriser la requête de recherche
    if (searchQuery) {
      const sanitizedQuery = searchQuery.trim().slice(0, MAX_SEARCH_LENGTH);
      query = query.ilike("title", `%${sanitizedQuery}%`);
    }
    if (selectedFrameworks?.length) {
      query = query.in("framework", selectedFrameworks);
    }

    if (isAccountPage && user) {
      query = query.eq("user_id", user.id);
    } else {
      query = query
        .not("last_assistant_message", "is", null)
        .is("is_private", false);
    }
    if (isPopular) {
      query = query
        .gt("likes", 0)
        .order("likes", { ascending: false })
        .order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    if (isLikedPage && user) {
      const { data: likedChats } = await supabase
        .from("chat_likes")
        .select("chat_id")
        .eq("user_id", user.id);
      if (likedChats) {
        query = query.in(
          "chat_id",
          likedChats.map((chat) => chat.chat_id),
        );
      } else {
        query = query.in("chat_id", []);
      }
    }
    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching public chats:", error);
      return [];
    }

    if (user && data && data.length > 0) {
      const chatIds = data.map((chat) => chat.chat_id);
      const { data: userLikes } = await supabase
        .from("chat_likes")
        .select("chat_id")
        .eq("user_id", user.id)
        .in("chat_id", chatIds);

      const likedChatIds = userLikes
        ? new Set(userLikes.map((like) => like.chat_id))
        : new Set();

      return data.map((chat) => ({
        ...chat,
        user_has_liked: likedChatIds.has(chat.chat_id),
      }));
    }
    return (data || []).map((chat) => ({
      ...chat,
      user_has_liked: false,
    }));
  } catch (err) {
    console.error("Unexpected error in getAllPublicChats:", err);
    return [];
  }
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

export const toggleChatLike = async (chatId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return { error: "User not authenticated" };
  }

  // Vérifier si le like existe déjà
  const { data: existingLike } = await supabase
    .from("chat_likes")
    .select("id")
    .eq("chat_id", chatId)
    .eq("user_id", user.id)
    .single();

  if (existingLike) {
    // Si le like existe, le supprimer et décrémenter le compteur de likes
    const { error: deleteError } = await supabase
      .from("chat_likes")
      .delete()
      .eq("id", existingLike.id);

    if (deleteError) {
      console.error("Erreur lors de la suppression du like:", deleteError);
      return { error: "Erreur lors de la suppression du like" };
    }

    const { data: chatData, error: chatDataError } = await supabase
      .from("chats")
      .select("likes")
      .eq("id", chatId)
      .single();

    if (chatDataError) {
      console.error(
        "Erreur lors de la récupération des données du chat:",
        chatDataError,
      );
      return { error: "Erreur lors de la récupération des données du chat" };
    }

    if (chatData) {
      await supabase
        .from("chats")
        .update({ likes: chatData.likes ? chatData.likes - 1 : 0 })
        .eq("id", chatId);
    }

    return { message: "Like removed" };
  } else {
    // Si le like n'existe pas, l'ajouter et incrémenter le compteur de likes
    const { error: newLikeError } = await supabase.from("chat_likes").insert({
      chat_id: chatId,
      user_id: user.id,
    });

    if (newLikeError) {
      console.error("Erreur lors de l'ajout du like:", newLikeError);
      return { error: "Erreur lors de l'ajout du like" };
    }

    const { data: chatData, error: chatDataError } = await supabase
      .from("chats")
      .select("likes")
      .eq("id", chatId)
      .single();

    if (chatDataError) {
      console.error(
        "Erreur lors de la récupération des données du chat:",
        chatDataError,
      );
      return { error: "Erreur lors de la récupération des données du chat" };
    }

    if (chatData) {
      await supabase
        .from("chats")
        .update({ likes: chatData.likes ? chatData.likes + 1 : 1 })
        .eq("id", chatId);
    }

    return { message: "Like added" };
  }
};

export const hasUserLikedChat = async (chatId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return false;
  }

  // Vérifier si le like existe pour l'utilisateur et le chat spécifiés
  const { data: existingLike } = await supabase
    .from("chat_likes")
    .select("id")
    .eq("chat_id", chatId)
    .eq("user_id", user.id)
    .single();

  return !!existingLike; // Retourne true si le like existe, sinon false
};

export const remixChat = async (
  chatId: string,
  selectedVersion: number | undefined,
) => {
  const supabase = await createClient();

  // Get the original chat
  const { data: originalChat } = await supabase
    .from("chats")
    .select(
      `
      id,
      artifact_code,
      title,
      framework,
      prompt_image,
      user_id,
      remix_chat_id,
      clone_url
    `,
    )
    .eq("id", chatId)
    .single();

  if (!originalChat) {
    throw new Error("Chat not found");
  }

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Check if user is a subscriber
  const subscription = await getSubscription();

  if (!subscription) {
    throw new Error("Only subscribers can remix projects");
  }

  if (originalChat.remix_chat_id) {
    throw new Error(
      "You have already remixed this component. You cannot remix the same component more than once.",
    );
  }

  const uniqueId = await generateUniqueNanoid();
  // Create a new chat as a remix - let Supabase generate the UUID
  const { data: newChat, error } = await supabase
    .from("chats")
    .insert({
      artifact_code: originalChat.artifact_code,
      title: createRemixTitle(originalChat.title || "Untitled Project"),
      framework: originalChat.framework,
      prompt_image: originalChat.prompt_image,
      user_id: user.id,
      remix_chat_id: originalChat.id,
      clone_url: originalChat.clone_url,
      is_private: false,
      slug: uniqueId,
    })
    .select()
    .single();

  if (error) {
    throw new Error("Failed to create remix");
  }

  // Get the latest version number
  const { data: versionData } = await supabase
    .from("messages")
    .select("version")
    .eq("chat_id", chatId)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (!versionData) {
    throw new Error("Could not determine the latest version");
  }

  // Calculate how many versions to fetch (up to 10 most recent versions)
  const startVersion = Math.max(
    0,
    selectedVersion !== undefined
      ? selectedVersion - 9
      : versionData.version - 9,
  );

  // Get messages from the last 10 versions (or all if less than 10) of the original chat
  const { data: originalMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .gte("version", startVersion)
    .lte("version", selectedVersion)
    .order("version", { ascending: true })
    .order("created_at", { ascending: true });

  if (!originalMessages || originalMessages.length === 0) {
    throw new Error("Original chat has no messages");
  }

  // Calculate version offset to start at version 0 in the new chat
  const versionOffset = startVersion;

  // Flatten and map all messages to insert them, adjusting the version number
  const messagesToInsert = originalMessages.map((message) => ({
    chat_id: newChat.id,
    role: message.role,
    content: message.content,
    version: message.version - versionOffset, // Adjust version number to start from 0
    is_built: false,
    screenshot: message.screenshot,
    theme: message.theme,
    artifact_code: message.artifact_code,
    prompt_image: message.prompt_image,
    input_tokens: message.input_tokens,
    output_tokens: message.output_tokens,
  }));

  // Insert all messages
  const { error: messagesError } = await supabase
    .from("messages")
    .insert(messagesToInsert);

  if (messagesError) {
    throw new Error("Failed to copy messages");
  }

  // Don't track remix usage - it's just a copy, not a real AI request

  const { data: originalIntegrations } = await supabase
    .from("chat_integrations")
    .select("integration_id, is_enabled")
    .eq("chat_id", chatId);

  if (originalIntegrations && originalIntegrations.length > 0) {
    await supabase.from("chat_integrations").insert(
      originalIntegrations.map((integration) => ({
        chat_id: newChat.id,
        integration_id: integration.integration_id,
        is_enabled: integration.is_enabled,
      })),
    );
  }

  after(async () => {
    // Get the latest assistant message from the newly created chat
    const lastAssistantMessage = await fetchLastAssistantMessageByChatId(
      newChat.id,
    );
    if (lastAssistantMessage) {
      await buildComponent(newChat.id, lastAssistantMessage.version);
    }
  });

  return newChat;
};

// Fonction pour récupérer le nombre de messages supplémentaires disponibles pour un utilisateur
export const getExtraMessagesCount = async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("extra_messages")
    .select("count")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.count;
};

// Fonction pour décrémenter le compteur de messages supplémentaires
export const decrementExtraMessagesCount = async (userId: string) => {
  const supabase = await createClient();

  // Récupérer le nombre actuel de messages supplémentaires
  const { data, error } = await supabase
    .from("extra_messages")
    .select("count")
    .eq("user_id", userId)
    .single();

  if (error || !data || data.count <= 0) {
    return false;
  }

  // Décrémenter le compteur
  const { error: updateError } = await supabase
    .from("extra_messages")
    .update({
      count: data.count - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return !updateError;
};

const createRemixTitle = (originalTitle: string) => {
  let baseTitle = originalTitle;
  if (baseTitle.startsWith("Remix of ")) {
    baseTitle = baseTitle.substring(9);
  }
  return `Remix - ${baseTitle}`;
};
