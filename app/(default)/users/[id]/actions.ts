import { GetComponentsReturnType } from "@/app/(default)/components/actions";
import { MAX_SEARCH_LENGTH } from "@/utils/config";
import { Framework } from "@/utils/config";
import { createClient } from "@/utils/supabase/server";

export async function getUser(id: string) {
  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  return user;
}

export const getLikedComponentsByUserId = async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_likes")
    .select("*")
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const getLatestComponentsByUserId = async (
  userId: string,
  limit: number = 20,
  offset: number = 0,
  isPopular: boolean = false,
  searchQuery?: string,
  selectedFrameworks?: Framework[],
) => {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    let query = supabase.rpc("get_chats_with_details");
    // 🔒 Sécuriser la requête de recherche
    if (searchQuery) {
      const sanitizedQuery = searchQuery.trim().slice(0, MAX_SEARCH_LENGTH);
      query = query.ilike("title", `%${sanitizedQuery}%`);
    }
    if (selectedFrameworks?.length) {
      query = query.in("framework", selectedFrameworks);
    }

    query = query.eq("user_id", userId);

    if (user?.id !== userId) {
      query = query.is("is_private", false);
    }

    if (isPopular) {
      query = query
        .gt("likes", 0)
        .order("likes", { ascending: false })
        .order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
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

      return data
        .filter(
          (chat): chat is typeof chat & { framework: string } =>
            chat.framework !== null,
        )
        .map(
          (chat): GetComponentsReturnType => ({
            chat_id: chat.chat_id,
            user_id: chat.user_id,
            framework: chat.framework,
            user_full_name: chat.user_full_name || "",
            user_avatar_url: chat.user_avatar_url || "",
            is_featured: chat.is_featured ?? false,
            is_private: chat.is_private ?? false,
            created_at: chat.created_at || "",
            first_user_message: chat.first_user_message || "",
            title: chat.title || "",
            likes: chat.likes ?? 0,
            last_assistant_message: chat.last_assistant_message || "",
            last_assistant_message_theme:
              chat.last_assistant_message_theme || "",
            slug: chat.slug || "",
            remix_chat_id: chat.remix_chat_id || "",
            user_has_liked: likedChatIds.has(chat.chat_id),
            screenshot: chat.last_assistant_message ?? undefined,
            clone_url: chat.clone_url ?? undefined,
            views: chat.views ?? undefined,
            artifact_code: chat.artifact_code ?? undefined,
            prompt_image: chat.prompt_image ?? undefined,
            input_tokens: chat.input_tokens ?? undefined,
            output_tokens: chat.output_tokens ?? undefined,
            remix_from_version: chat.remix_from_version ?? undefined,
            ...(chat.metadata &&
            typeof chat.metadata === "object" &&
            !Array.isArray(chat.metadata)
              ? { metadata: chat.metadata }
              : {}),
            github_repo_url: chat.github_repo_url ?? undefined,
            github_repo_name: chat.github_repo_name ?? undefined,
            last_github_sync: chat.last_github_sync ?? undefined,
            last_github_commit_sha: chat.last_github_commit_sha ?? undefined,
            deploy_subdomain: chat.deploy_subdomain ?? undefined,
            deployed_at: chat.deployed_at ?? undefined,
            deployed_version: chat.deployed_version ?? undefined,
            is_deployed: chat.is_deployed ?? undefined,
            remixes_count: chat.remixes_count ?? undefined,
          }),
        );
    }

    return data
      .filter(
        (chat): chat is typeof chat & { framework: string } =>
          chat.framework !== null,
      )
      .map(
        (chat): GetComponentsReturnType => ({
          chat_id: chat.chat_id,
          user_id: chat.user_id,
          framework: chat.framework,
          user_full_name: chat.user_full_name || "",
          user_avatar_url: chat.user_avatar_url || "",
          is_featured: chat.is_featured ?? false,
          is_private: chat.is_private ?? false,
          created_at: chat.created_at || "",
          first_user_message: chat.first_user_message || "",
          title: chat.title || "",
          likes: chat.likes ?? 0,
          last_assistant_message: chat.last_assistant_message || "",
          last_assistant_message_theme: chat.last_assistant_message_theme || "",
          slug: chat.slug || "",
          remix_chat_id: chat.remix_chat_id || "",
          user_has_liked: false,
          screenshot: chat.last_assistant_message ?? undefined,
          clone_url: chat.clone_url ?? undefined,
          views: chat.views ?? undefined,
          artifact_code: chat.artifact_code ?? undefined,
          prompt_image: chat.prompt_image ?? undefined,
          input_tokens: chat.input_tokens ?? undefined,
          output_tokens: chat.output_tokens ?? undefined,
          remix_from_version: chat.remix_from_version ?? undefined,
          ...(chat.metadata &&
          typeof chat.metadata === "object" &&
          !Array.isArray(chat.metadata)
            ? { metadata: chat.metadata }
            : {}),
          github_repo_url: chat.github_repo_url ?? undefined,
          github_repo_name: chat.github_repo_name ?? undefined,
          last_github_sync: chat.last_github_sync ?? undefined,
          last_github_commit_sha: chat.last_github_commit_sha ?? undefined,
          deploy_subdomain: chat.deploy_subdomain ?? undefined,
          deployed_at: chat.deployed_at ?? undefined,
          deployed_version: chat.deployed_version ?? undefined,
          is_deployed: chat.is_deployed ?? undefined,
          remixes_count: chat.remixes_count ?? undefined,
        }),
      );
  } catch (err) {
    console.error("Unexpected error in getAllPublicChats:", err);
    return [];
  }
};

export const getLatestActivityByUserId = async (userId: string) => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  // Condition pour filtrer les composants privés
  const isOwner = user?.id === userId;

  // Définir des limites pour chaque type d'activité
  const LIMIT_PER_ACTIVITY = 10;

  // Récupérer les likes
  const { data: likesData, error: likesError } = await supabase
    .from("chat_likes")
    .select("*, chat:chat_id(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIMIT_PER_ACTIVITY);

  if (likesError) {
    console.error("Erreur lors de la récupération des likes:", likesError);
    return [];
  }

  // Récupérer les remixes
  let remixQuery = supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .not("remix_chat_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(LIMIT_PER_ACTIVITY);

  // N'afficher les composants privés que si l'utilisateur est le propriétaire
  if (!isOwner) {
    remixQuery = remixQuery.is("is_private", false);
  }

  const { data: remixesData, error: remixesError } = await remixQuery;

  if (remixesError) {
    console.error("Erreur lors de la récupération des remixes:", remixesError);
    return [];
  }

  // Récupérer les créations (composants originaux)
  let creationsQuery = supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .is("remix_chat_id", null)
    .order("created_at", { ascending: false })
    .limit(LIMIT_PER_ACTIVITY);

  // N'afficher les composants privés que si l'utilisateur est le propriétaire
  if (!isOwner) {
    creationsQuery = creationsQuery.is("is_private", false);
  }

  const { data: creationsData, error: creationsError } = await creationsQuery;

  if (creationsError) {
    console.error(
      "Erreur lors de la récupération des créations:",
      creationsError,
    );
    return [];
  }
  // Filtrer les likes pour n'inclure que les chats publics ou ceux appartenant à l'utilisateur
  const filteredLikes = likesData.filter(
    (like) => !like.chat.is_private || isOwner,
  );

  // Transformer les données pour avoir un format uniforme
  const likes = filteredLikes.map((like) => ({
    type: "like",
    data: like,
    chat: like.chat,
    created_at: like.created_at,
  }));

  const remixes = remixesData.map((remix) => ({
    type: "remix",
    data: remix,
    chat: remix,
    created_at: remix.created_at,
  }));

  const creations = creationsData.map((creation) => ({
    type: "creation",
    data: creation,
    chat: creation,
    created_at: creation.created_at,
  }));

  // Combiner toutes les activités
  const allActivities = [...likes, ...remixes, ...creations];

  // Trier par date (du plus récent au plus ancien)
  allActivities.sort(
    (a, b) =>
      new Date(b.created_at || "").getTime() -
      new Date(a.created_at || "").getTime(),
  );

  // Retourner les 5 activités les plus récentes
  return allActivities.slice(0, 5);
};

export const getComponentsCountByUserId = async (userId: string) => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("chats")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    return 0;
  }
  return count;
};

export const getRemixesCountByUserId = async (userId: string) => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("chats")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("remix_chat_id", "is", null);
  if (error) {
    return 0;
  }
  return count;
};

export const getLikesCountByUserId = async (userId: string) => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("chat_likes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    return 0;
  }
  return count;
};
