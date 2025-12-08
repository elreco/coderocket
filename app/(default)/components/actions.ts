"use server";

import { format } from "date-fns";
import { nanoid } from "nanoid";
import { after } from "next/server";

import { getSubscription } from "@/app/supabase-server";
import { Database } from "@/types_db";
import {
  Framework,
  MAX_SEARCH_LENGTH,
  defaultTheme,
  MAX_TOKENS_PER_REQUEST,
  PREMIUM_CHAR_LIMIT,
} from "@/utils/config";
import { defaultArtifactCode } from "@/utils/default-artifact-code";
import { uploadFiles } from "@/utils/file-uploader";
import {
  ROCKET_LIMITS_PER_PLAN,
  tokensToRockets,
} from "@/utils/rocket-conversion";
import { createClient } from "@/utils/supabase/server";
import { getUserTokenUsage } from "@/utils/token-pricing";

import { buildComponent } from "./[slug]/actions";

type GetChatsWithDetailsReturnType =
  Database["public"]["Functions"]["get_chats_with_details"]["Returns"][number];

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
  screenshot?: string;
  views?: number;
  artifact_code?: string;
  prompt_image?: string;
  input_tokens?: number;
  output_tokens?: number;
  remix_from_version?: number;
  metadata?: Record<string, unknown>;
  github_repo_url?: string;
  github_repo_name?: string;
  last_github_sync?: string;
  last_github_commit_sha?: string;
  deploy_subdomain?: string;
  deployed_at?: string;
  deployed_version?: number;
  is_deployed?: boolean;
  remixes_count?: number;
};

function transformRpcResultToComponentType(
  chat: GetChatsWithDetailsReturnType,
  userHasLiked: boolean = false,
): GetComponentsReturnType {
  return {
    chat_id: chat.chat_id,
    user_id: chat.user_id,
    framework: chat.framework ?? "",
    user_full_name: chat.user_full_name ?? "",
    user_avatar_url: chat.user_avatar_url ?? "",
    is_featured: chat.is_featured ?? false,
    is_private: chat.is_private ?? false,
    created_at: chat.created_at ?? "",
    first_user_message: chat.first_user_message ?? "",
    title: chat.title ?? "",
    likes: chat.likes ?? 0,
    last_assistant_message: chat.last_assistant_message ?? "",
    last_assistant_message_theme: chat.last_assistant_message_theme ?? "",
    slug: chat.slug ?? "",
    remix_chat_id: chat.remix_chat_id ?? "",
    clone_url: chat.clone_url ?? undefined,
    user_has_liked: userHasLiked,
    screenshot: chat.last_assistant_message ?? undefined,
    views: chat.views ?? undefined,
    artifact_code: chat.artifact_code ?? undefined,
    prompt_image: chat.prompt_image ?? undefined,
    input_tokens: chat.input_tokens ?? undefined,
    output_tokens: chat.output_tokens ?? undefined,
    remix_from_version: chat.remix_from_version ?? undefined,
    metadata:
      chat.metadata && typeof chat.metadata === "object"
        ? (chat.metadata as Record<string, unknown>)
        : undefined,
    github_repo_url: chat.github_repo_url ?? undefined,
    github_repo_name: chat.github_repo_name ?? undefined,
    last_github_sync: chat.last_github_sync ?? undefined,
    last_github_commit_sha: chat.last_github_commit_sha ?? undefined,
    deploy_subdomain: chat.deploy_subdomain ?? undefined,
    deployed_at: chat.deployed_at ?? undefined,
    deployed_version: chat.deployed_version ?? undefined,
    is_deployed: chat.is_deployed ?? undefined,
    remixes_count: chat.remixes_count ?? undefined,
  };
}

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

    // Use token-based tracking system
    const tokenUsage = await getUserTokenUsage(
      user.id,
      currentPeriodStart,
      currentPeriodEnd,
    );

    const limits = ROCKET_LIMITS_PER_PLAN.free;
    const rocketsUsed = tokensToRockets(
      tokenUsage.input_tokens + tokenUsage.output_tokens,
    );

    if (rocketsUsed >= limits.monthly_rockets) {
      if (extraMessages > 0) {
        const decremented = await decrementExtraMessagesCount(user.id);
        if (!decremented) {
          const resetDate = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            1,
          );
          return {
            error: {
              title: "Rocket limit reached",
              description: `You have reached your limit of ${limits.monthly_rockets} 🚀 Rockets for this month. Your limit will reset next month (${format(
                resetDate,
                "d MMMM yyyy",
              )}). Upgrade to a paid plan or purchase Rockets to continue.`,
            },
          };
        }
      } else {
        const resetDate = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1,
        );
        return {
          error: {
            title: "Rocket limit reached",
            description: `You have reached your limit of ${limits.monthly_rockets} 🚀 Rockets for this month. Your limit will reset next month (${format(
              resetDate,
              "d MMMM yyyy",
            )}). Upgrade to a paid plan or purchase Rockets to continue.`,
          },
        };
      }
    }
  } else {
    // Calculate the start of the current billing month based on current_period_start
    const currentPeriodStart = new Date(subscription.current_period_start);
    const currentPeriodEnd = new Date(subscription.current_period_end);

    // Use token-based tracking system
    const tokenUsage = await getUserTokenUsage(
      user.id,
      currentPeriodStart,
      currentPeriodEnd,
    );

    const planName =
      subscription.prices?.products?.name?.toLowerCase() || "free";
    const limits =
      ROCKET_LIMITS_PER_PLAN[planName as keyof typeof ROCKET_LIMITS_PER_PLAN] ||
      ROCKET_LIMITS_PER_PLAN.free;

    const rocketsUsed = tokensToRockets(
      tokenUsage.input_tokens + tokenUsage.output_tokens,
    );

    if (rocketsUsed >= limits.monthly_rockets) {
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
              description: `You have reached your limit of ${limits.monthly_rockets} 🚀 Rockets for this ${subscription.prices?.interval}. This limit will reset on ${resetDate}. Go to My Account to see your usage or purchase Rockets.`,
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
            description: `You have reached your limit of ${limits.monthly_rockets} 🚀 Rockets for this ${subscription.prices?.interval}. This limit will reset on ${resetDate}. Go to My Account to see your usage or purchase Rockets.`,
          },
        };
      }
    }
  }

  let imageUrl = null;
  const filesArray: {
    url: string;
    order: number;
    type: string;
    mimeType: string;
    source?: string;
  }[] = [];
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
    const uploadResult = await uploadFiles(files, user.id);

    if (!uploadResult.success) {
      return {
        error: {
          title: "Failed to upload files",
          description: uploadResult.error || "Please try again later.",
        },
      };
    }

    uploadResult.uploadedFiles.forEach((fileInfo, i) => {
      const originalFile = files[i];
      const isFigmaFile = originalFile.name
        .toLowerCase()
        .includes("figma-design");

      const fileData = {
        url: fileInfo.path,
        order: i,
        type: fileInfo.type,
        mimeType: fileInfo.mimeType,
        ...(isFigmaFile && { source: "figma" }),
      };

      filesArray.push(fileData);
      if (i === 0) {
        imageUrl = fileInfo.path;
      }
    });
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
    files?: {
      url: string;
      order: number;
      type?: string;
      mimeType?: string;
      source?: string;
    }[];
    content: string;
    version: number;
    subscription_type: string;
  } = {
    chat_id: data.id,
    role: "user",
    theme,
    content: prompt,
    version: -1,
    subscription_type: subscriptionType,
  };

  if (imageUrl) {
    messageData.prompt_image = imageUrl;
  }

  if (filesArray.length > 0) {
    messageData.files = filesArray;
  }

  const { error: messageError } = await supabase
    .from("messages")
    .insert(messageData);

  if (messageError) {
    await supabase.from("chats").delete().eq("id", data.id);
    return {
      error: {
        title: "Failed to create message",
        description: "Please try again later.",
      },
    };
  }

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
  limit: number = 16,
  offset: number = 0,
  sortBy: "newest" | "top" | "remix" = "newest",
  searchQuery?: string,
  selectedFrameworks?: Framework[],
  isAccountPage?: boolean,
  isLikedPage?: boolean,
  user?: { id: string } | null,
): Promise<GetComponentsReturnType[]> => {
  try {
    const supabase = await createClient();
    let currentUser = user;
    if (!currentUser) {
      const { data: userData } = await supabase.auth.getUser();
      currentUser = userData.user;
    }

    let query = supabase.rpc("get_chats_with_details");
    // 🔒 Sécuriser la requête de recherche
    if (searchQuery) {
      const sanitizedQuery = searchQuery.trim().slice(0, MAX_SEARCH_LENGTH);
      query = query.ilike("title", `%${sanitizedQuery}%`);
    }
    if (selectedFrameworks?.length) {
      query = query.in("framework", selectedFrameworks);
    }

    if (isAccountPage && currentUser) {
      query = query.eq("user_id", currentUser.id);
    } else {
      query = query
        .not("last_assistant_message", "is", null)
        .is("is_private", false);
    }
    if (sortBy === "top") {
      query = query
        .order("likes", { ascending: false })
        .order("created_at", { ascending: false });
    } else if (sortBy === "remix") {
      query = query
        .order("remixes_count", { ascending: false })
        .order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    if (isLikedPage && currentUser) {
      const { data: likedChats } = await supabase
        .from("chat_likes")
        .select("chat_id")
        .eq("user_id", currentUser.id);
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

    if (!data || data.length === 0) {
      return [];
    }

    if (user) {
      const chatIds = data.map((chat) => chat.chat_id);
      const { data: userLikes } = await supabase
        .from("chat_likes")
        .select("chat_id")
        .eq("user_id", user.id)
        .in("chat_id", chatIds);

      const likedChatIds = userLikes
        ? new Set(userLikes.map((like) => like.chat_id))
        : new Set();

      return data.map((chat) =>
        transformRpcResultToComponentType(chat, likedChatIds.has(chat.chat_id)),
      );
    }

    return data.map((chat) => transformRpcResultToComponentType(chat, false));
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

  const { data: existingLike } = await supabase
    .from("chat_likes")
    .select("id")
    .eq("chat_id", chatId)
    .eq("user_id", user.id)
    .single();

  return !!existingLike;
};

export const fetchChatDataOptimized = async (chatId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const [chatResult, messagesResult, likeResult] = await Promise.all([
    supabase
      .from("chats")
      .select("*, user:users!user_id (*)")
      .eq("id", chatId)
      .single(),
    supabase
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
      .order("version", { ascending: false })
      .order("role", { ascending: false }),
    user
      ? supabase
          .from("chat_likes")
          .select("id")
          .eq("chat_id", chatId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const messages = messagesResult.data || [];

  const serializedMessages = messages.map((msg) => ({
    ...msg,
    files: msg.files ? JSON.parse(JSON.stringify(msg.files)) : null,
  }));

  const lastAssistantMessage = serializedMessages.find(
    (m) => m.role === "assistant",
  );
  const lastUserMessage = serializedMessages.find((m) => m.role === "user");

  return {
    chat: chatResult.data,
    messages: serializedMessages,
    lastAssistantMessage,
    lastUserMessage,
    isLiked: !!likeResult.data,
  };
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

  const targetVersion =
    selectedVersion !== undefined ? selectedVersion : versionData.version;

  // Get all messages from version 0 to the target version
  const { data: originalMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .gte("version", 0)
    .lte("version", targetVersion)
    .order("version", { ascending: true })
    .order("created_at", { ascending: true });

  if (!originalMessages || originalMessages.length === 0) {
    throw new Error("Original chat has no messages");
  }

  // No version offset needed - we copy from version 0
  const versionOffset = 0;

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

  const isOwner = originalChat.user_id === user.id;

  if (isOwner) {
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
  if (baseTitle.startsWith("Remix - ")) {
    baseTitle = baseTitle.substring(8);
  }
  return baseTitle;
};

export const getComponentsByFramework = async (
  framework: Framework,
  limit: number = 10,
  user?: { id: string } | null,
): Promise<GetComponentsReturnType[]> => {
  try {
    const supabase = await createClient();
    let currentUser = user;
    if (!currentUser) {
      const { data: userData } = await supabase.auth.getUser();
      currentUser = userData.user;
    }

    const query = supabase
      .rpc("get_chats_with_details")
      .eq("framework", framework)
      .not("last_assistant_message", "is", null)
      .is("is_private", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching components by framework:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    if (currentUser) {
      const chatIds = data.map((chat) => chat.chat_id);
      const { data: userLikes } = await supabase
        .from("chat_likes")
        .select("chat_id")
        .eq("user_id", currentUser.id)
        .in("chat_id", chatIds);

      const likedChatIds = userLikes
        ? new Set(userLikes.map((like) => like.chat_id))
        : new Set();

      return data.map((chat) =>
        transformRpcResultToComponentType(chat, likedChatIds.has(chat.chat_id)),
      );
    }

    return data.map((chat) => transformRpcResultToComponentType(chat, false));
  } catch (err) {
    console.error("Unexpected error in getComponentsByFramework:", err);
    return [];
  }
};

export const getMostPopularComponents = async (
  limit: number = 10,
  user?: { id: string } | null,
): Promise<GetComponentsReturnType[]> => {
  try {
    const supabase = await createClient();
    let currentUser = user;
    if (!currentUser) {
      const { data: userData } = await supabase.auth.getUser();
      currentUser = userData.user;
    }

    const query = supabase
      .rpc("get_chats_with_details")
      .not("last_assistant_message", "is", null)
      .is("is_private", false)
      .gt("likes", 0)
      .order("likes", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching most popular components:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    if (currentUser) {
      const chatIds = data.map((chat) => chat.chat_id);
      const { data: userLikes } = await supabase
        .from("chat_likes")
        .select("chat_id")
        .eq("user_id", currentUser.id)
        .in("chat_id", chatIds);

      const likedChatIds = userLikes
        ? new Set(userLikes.map((like) => like.chat_id))
        : new Set();

      return data.map((chat) =>
        transformRpcResultToComponentType(chat, likedChatIds.has(chat.chat_id)),
      );
    }

    return data.map((chat) => transformRpcResultToComponentType(chat, false));
  } catch (err) {
    console.error("Unexpected error in getMostPopularComponents:", err);
    return [];
  }
};

export type GetDeployedSitesReturnType = GetComponentsReturnType & {
  custom_domain?: string | null;
  deployed_screenshot?: string | null;
};

export const getDeployedSites = async (
  limit: number = 10,
): Promise<GetDeployedSitesReturnType[]> => {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    const { data: chats, error } = await supabase
      .from("chats")
      .select(
        `
        *,
        user:users!user_id (
          id,
          full_name,
          avatar_url
        )
      `,
      )
      .eq("is_deployed", true)
      .eq("is_private", false)
      .not("deployed_at", "is", null)
      .order("deployed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching deployed sites:", error);
      return [];
    }

    if (!chats || chats.length === 0) {
      return [];
    }

    const chatIds = chats.map((chat) => chat.id);
    const chatVersionMap = new Map<string, number>();
    chats.forEach((chat) => {
      if (
        chat.deployed_version !== null &&
        chat.deployed_version !== undefined
      ) {
        chatVersionMap.set(chat.id, chat.deployed_version);
      }
    });

    const [
      { data: customDomains },
      { data: userLikes },
      { data: screenshots },
      { data: firstMessages },
      { data: remixesCounts },
    ] = await Promise.all([
      supabase
        .from("custom_domains")
        .select("chat_id, domain, is_verified")
        .in("chat_id", chatIds)
        .eq("is_verified", true),
      user
        ? supabase
            .from("chat_likes")
            .select("chat_id")
            .eq("user_id", user.id)
            .in("chat_id", chatIds)
        : Promise.resolve({ data: [] }),
      chatVersionMap.size > 0
        ? (() => {
            const orConditions = Array.from(chatVersionMap.entries())
              .map(
                ([chatId, version]) =>
                  `and(chat_id.eq.${chatId},version.eq.${version})`,
              )
              .join(",");
            return supabase
              .from("messages")
              .select("chat_id, screenshot")
              .eq("role", "assistant")
              .or(orConditions);
          })()
        : Promise.resolve({ data: [] }),
      supabase
        .from("messages")
        .select("chat_id, content")
        .eq("role", "user")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("chats")
        .select("remix_chat_id")
        .in("remix_chat_id", chatIds)
        .not("remix_chat_id", "is", null),
    ]);

    const domainMap = new Map<string, string>();
    if (customDomains) {
      customDomains.forEach((domain) => {
        domainMap.set(domain.chat_id, domain.domain);
      });
    }

    const likedChatIds = new Set<string>();
    if (userLikes) {
      userLikes.forEach((like) => likedChatIds.add(like.chat_id));
    }

    const screenshotMap = new Map<string, string | null>();
    if (screenshots) {
      screenshots.forEach((msg) => {
        if (msg.screenshot) {
          screenshotMap.set(msg.chat_id, msg.screenshot);
        }
      });
    }

    const firstMessageMap = new Map<string, string>();
    if (firstMessages) {
      const seen = new Set<string>();
      firstMessages.forEach((msg) => {
        if (!seen.has(msg.chat_id)) {
          firstMessageMap.set(msg.chat_id, msg.content);
          seen.add(msg.chat_id);
        }
      });
    }

    const remixesCountMap = new Map<string, number>();
    if (remixesCounts) {
      remixesCounts.forEach((chat) => {
        if (chat.remix_chat_id) {
          remixesCountMap.set(
            chat.remix_chat_id,
            (remixesCountMap.get(chat.remix_chat_id) || 0) + 1,
          );
        }
      });
    }

    const deployedSitesWithScreenshots = chats.map((chat) => {
      const deployedScreenshot = screenshotMap.get(chat.id) || null;
      const firstUserMessage = firstMessageMap.get(chat.id) || "";
      const remixesCount = remixesCountMap.get(chat.id) || 0;

      const component: GetComponentsReturnType = {
        chat_id: chat.id,
        user_id: chat.user?.id || chat.user_id,
        framework: chat.framework || "",
        user_full_name: chat.user?.full_name || "",
        user_avatar_url: chat.user?.avatar_url || "",
        is_featured: chat.is_featured || false,
        is_private: chat.is_private || false,
        created_at: chat.created_at || "",
        first_user_message: firstUserMessage,
        title: chat.title || "",
        likes: chat.likes || 0,
        last_assistant_message: deployedScreenshot || "",
        last_assistant_message_theme: "",
        slug: chat.slug || "",
        remix_chat_id: chat.remix_chat_id || "",
        clone_url: chat.clone_url || undefined,
        user_has_liked: likedChatIds.has(chat.id),
        screenshot: deployedScreenshot || undefined,
        views: chat.views || undefined,
        artifact_code: chat.artifact_code || undefined,
        prompt_image: chat.prompt_image || undefined,
        input_tokens: chat.input_tokens || undefined,
        output_tokens: chat.output_tokens || undefined,
        remix_from_version: chat.remix_from_version || undefined,
        metadata:
          chat.metadata && typeof chat.metadata === "object"
            ? (chat.metadata as Record<string, unknown>)
            : undefined,
        github_repo_url: chat.github_repo_url || undefined,
        github_repo_name: chat.github_repo_name || undefined,
        last_github_sync: chat.last_github_sync || undefined,
        last_github_commit_sha: chat.last_github_commit_sha || undefined,
        deploy_subdomain: chat.deploy_subdomain || undefined,
        deployed_at: chat.deployed_at || undefined,
        deployed_version: chat.deployed_version || undefined,
        is_deployed: chat.is_deployed || undefined,
        remixes_count: remixesCount,
      };

      return {
        ...component,
        custom_domain: domainMap.get(chat.id) || null,
        deployed_screenshot: deployedScreenshot,
      };
    });

    const deployedSites = deployedSitesWithScreenshots.filter(
      (site) => site.deployed_screenshot,
    );

    deployedSites.sort((a, b) => {
      const dateA = a.deployed_at ? new Date(a.deployed_at).getTime() : 0;
      const dateB = b.deployed_at ? new Date(b.deployed_at).getTime() : 0;
      return dateB - dateA;
    });

    return deployedSites;
  } catch (err) {
    console.error("Unexpected error in getDeployedSites:", err);
    return [];
  }
};
