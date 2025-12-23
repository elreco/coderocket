"use server";

import { Database } from "@/types_db";
import { Framework, MAX_SEARCH_LENGTH } from "@/utils/config";
import { createClient } from "@/utils/supabase/server";

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
