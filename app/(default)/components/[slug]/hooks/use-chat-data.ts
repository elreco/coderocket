import { useCallback, useEffect, useRef, useState } from "react";

import { getSubscription } from "@/app/supabase-server";
import { ChatMessage } from "@/context/component-context";
import type { CustomDomainData } from "@/types/custom-domain";
import { Tables } from "@/types_db";
import { extractFilesFromArtifact } from "@/utils/completion-parser";
import { getArtifactCodeByVersion } from "@/utils/supabase/artifact-helpers";
import { createClient } from "@/utils/supabase/client";

import {
  fetchChatById,
  fetchChatDataOptimized,
  fetchMessagesByChatId,
} from "../../actions";
import { getDisplayTitle, updateDocumentTitle } from "../utils/title-utils";

interface UseChatDataOptions {
  chatId: string;
  user: Tables<"users"> | null;
  connectedUser?: { id: string } | null;
}

interface ChatDataState {
  fetchedChat: Tables<"chats"> | null;
  messages: ChatMessage[];
  lastAssistantMessage: Tables<"messages"> | null;
  lastUserMessage: Tables<"messages"> | null;
  isLiked: boolean;
  likesCount: number;
  remixOriginalChat: Tables<"chats"> | null;
  hasAlreadyRemixed: boolean;
  customDomain: CustomDomainData | null;
  subscription: Tables<"subscriptions"> | null;
  githubConnection: Tables<"github_connections"> | null;
  title: string;
  isVisible: boolean;
  artifactCode: string;
  isWebcontainerReady: boolean;
  isLengthError: boolean;
  selectedVersion: number;
  previousArtifactFiles: ReturnType<typeof extractFilesFromArtifact>;
  defaultImage: string | null;
  defaultFiles: string[];
  isDataLoaded: boolean;
  needsGeneration: boolean;
  isGenerationIncomplete: boolean;
  incompleteContent: string | null;
  initialArtifactFiles: ReturnType<typeof extractFilesFromArtifact>;
  initialEditorValue: string;
  initialActiveTab: string;
}

export function useChatData({
  chatId,
  user,
  connectedUser,
}: UseChatDataOptions) {
  const supabase = createClient();
  const selectedVersionRef = useRef<number | undefined>(undefined);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [state, setState] = useState<ChatDataState>({
    fetchedChat: null,
    messages: [],
    lastAssistantMessage: null,
    lastUserMessage: null,
    isLiked: false,
    likesCount: 0,
    remixOriginalChat: null,
    hasAlreadyRemixed: false,
    customDomain: null,
    subscription: null,
    githubConnection: null,
    title: "",
    isVisible: true,
    artifactCode: "",
    isWebcontainerReady: false,
    isLengthError: false,
    selectedVersion: 0,
    previousArtifactFiles: [],
    defaultImage: null,
    defaultFiles: [],
    isDataLoaded: false,
    needsGeneration: false,
    isGenerationIncomplete: false,
    incompleteContent: null,
    initialArtifactFiles: [],
    initialEditorValue: "",
    initialActiveTab: "",
  });

  const fetchAdditionalData = useCallback(
    async (chat: Tables<"chats">) => {
      try {
        const domainPromise = chat.is_deployed
          ? supabase
              .from("custom_domains")
              .select("*")
              .eq("chat_id", chatId)
              .maybeSingle()
              .then((r) => r.data)
          : Promise.resolve(null);

        const subPromise = (async () => {
          try {
            if (!connectedUser?.id) {
              return null;
            }
            const { data } = await supabase
              .from("subscriptions")
              .select("*, prices(*, products(*))")
              .in("status", ["trialing", "active"])
              .eq("user_id", connectedUser.id)
              .maybeSingle();
            return data;
          } catch {
            return null;
          }
        })();

        const githubPromise = (async () => {
          try {
            if (!connectedUser?.id) {
              return null;
            }
            const { data } = await supabase
              .from("github_connections")
              .select("*")
              .eq("user_id", connectedUser.id)
              .maybeSingle();
            return data;
          } catch {
            return null;
          }
        })();

        const [domainData, subData, githubData] = await Promise.all([
          domainPromise,
          subPromise,
          githubPromise,
        ]);

        return {
          customDomain: domainData,
          subscription: subData,
          githubConnection: githubData,
        };
      } catch (error) {
        console.error("Error loading additional data:", error);
        return {
          customDomain: null,
          subscription: null,
          githubConnection: null,
        };
      }
    },
    [chatId, connectedUser?.id, supabase],
  );

  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true);

      const [chatData, sub] = await Promise.all([
        fetchChatDataOptimized(chatId),
        user ? getSubscription() : Promise.resolve(null),
      ]);

      const {
        chat,
        messages: msgs,
        lastAssistantMessage: assistantMsg,
        lastUserMessage: userMsg,
        isLiked: hasLiked,
      } = chatData;

      if (!chat) {
        setIsInitialLoading(false);
        return;
      }

      let originalChat = null;
      let hasRemixed = false;
      if (chat.remix_chat_id) {
        originalChat = await fetchChatById(chat.remix_chat_id);
        hasRemixed = true;
      }

      const baseVersion = userMsg?.version ?? 0;
      let previousFiles: ReturnType<typeof extractFilesFromArtifact> = [];
      if (baseVersion > 0) {
        const previousCode = await getArtifactCodeByVersion(
          chatId,
          baseVersion - 1,
        );
        if (previousCode) {
          previousFiles = extractFilesFromArtifact(previousCode);
        }
      }

      selectedVersionRef.current = userMsg?.version || 0;

      const additionalData = await fetchAdditionalData(chat);

      const isLengthError =
        assistantMsg?.content?.includes("<!-- FINISH_REASON: length -->") ||
        assistantMsg?.content?.includes("<!-- FINISH_REASON: error -->") ||
        false;

      const isGenerationIncomplete =
        assistantMsg?.content &&
        !assistantMsg.content.includes("<!-- FINISH_REASON:") &&
        userMsg &&
        msgs &&
        msgs.length >= 2 &&
        msgs[msgs.length - 1]?.role === "assistant";

      const needsGeneration = msgs?.length === 1 && !!userMsg && !assistantMsg;

      let defaultImg: string | null = null;
      let defaultFilesArr: string[] = [];
      if (needsGeneration && userMsg) {
        defaultImg = userMsg?.prompt_image || null;
        defaultFilesArr = userMsg?.files
          ? Array.isArray(userMsg.files)
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              userMsg.files.map((f: any) => f?.url)
            : []
          : userMsg?.prompt_image
            ? [userMsg.prompt_image]
            : [];
      }

      let initialArtifactFiles: ReturnType<typeof extractFilesFromArtifact> =
        [];
      let initialEditorValue = "";
      let initialActiveTab = "";

      if (!needsGeneration && chat?.framework !== "html" && chat.framework) {
        const artifactCodeToUse =
          assistantMsg?.artifact_code || chat.artifact_code || "";

        if (artifactCodeToUse && assistantMsg?.content) {
          initialArtifactFiles = extractFilesFromArtifact(artifactCodeToUse);
          const firstFile = initialArtifactFiles[0];
          if (firstFile) {
            initialEditorValue = firstFile.content;
            initialActiveTab = firstFile.name || "";
          }
        }
      }

      setState({
        fetchedChat: chat,
        messages: msgs as ChatMessage[],
        lastAssistantMessage: assistantMsg || null,
        lastUserMessage: userMsg || null,
        isLiked: hasLiked,
        likesCount: chat.likes || 0,
        remixOriginalChat: originalChat,
        hasAlreadyRemixed: hasRemixed,
        customDomain: additionalData.customDomain,
        subscription: sub || additionalData.subscription,
        githubConnection: additionalData.githubConnection,
        title: getDisplayTitle(chat.title, userMsg?.version, chat.framework),
        isVisible: !chat.is_private,
        artifactCode: chat.artifact_code || "",
        isWebcontainerReady: assistantMsg?.is_built || false,
        isLengthError,
        selectedVersion: userMsg?.version || 0,
        previousArtifactFiles: previousFiles,
        defaultImage: defaultImg,
        defaultFiles: defaultFilesArr,
        isDataLoaded: true,
        needsGeneration,
        isGenerationIncomplete: !!isGenerationIncomplete,
        incompleteContent: isGenerationIncomplete
          ? (assistantMsg?.content ?? null)
          : null,
        initialArtifactFiles,
        initialEditorValue,
        initialActiveTab,
      });

      setIsInitialLoading(false);
    };

    loadInitialData();
  }, [chatId, user, fetchAdditionalData]);

  const refreshChatData = useCallback(async () => {
    const refreshedChatMessages = await fetchMessagesByChatId(chatId, false);
    if (!refreshedChatMessages) return undefined;

    const refreshedChat = await fetchChatById(chatId);
    if (!refreshedChat) return undefined;

    const selectedVersion = selectedVersionRef.current;
    const artifactCodeFromVersion = await getArtifactCodeByVersion(
      chatId,
      selectedVersion,
    );

    const additionalData = refreshedChat.is_deployed
      ? await fetchAdditionalData(refreshedChat)
      : { customDomain: null, subscription: null, githubConnection: null };

    const displayTitle = getDisplayTitle(
      refreshedChat.title,
      selectedVersion,
      refreshedChat.framework,
    );
    updateDocumentTitle(
      refreshedChat.title,
      selectedVersion,
      refreshedChat.framework,
    );

    setState((prev) => ({
      ...prev,
      messages: refreshedChatMessages as ChatMessage[],
      fetchedChat: refreshedChat,
      likesCount: refreshedChat.likes || 0,
      artifactCode: artifactCodeFromVersion || "",
      title: displayTitle,
      customDomain: additionalData.customDomain ?? prev.customDomain,
      subscription: additionalData.subscription ?? prev.subscription,
      githubConnection:
        additionalData.githubConnection ?? prev.githubConnection,
    }));

    return refreshedChatMessages as ChatMessage[];
  }, [chatId, fetchAdditionalData]);

  const refreshChat = useCallback(async () => {
    const refreshedChat = await fetchChatById(chatId);
    if (!refreshedChat) return;
    setState((prev) => ({
      ...prev,
      fetchedChat: refreshedChat,
      likesCount: refreshedChat.likes || 0,
    }));
  }, [chatId]);

  const updateMessages = useCallback((messages: ChatMessage[]) => {
    setState((prev) => ({ ...prev, messages }));
  }, []);

  const updateFetchedChat = useCallback((chat: Tables<"chats">) => {
    setState((prev) => ({ ...prev, fetchedChat: chat }));
  }, []);

  const updateLikesCount = useCallback((count: number) => {
    setState((prev) => ({ ...prev, likesCount: count }));
  }, []);

  const updateTitle = useCallback((title: string) => {
    setState((prev) => ({ ...prev, title }));
  }, []);

  const updateVisibility = useCallback((isVisible: boolean) => {
    setState((prev) => ({ ...prev, isVisible }));
  }, []);

  const updateCustomDomain = useCallback((domain: CustomDomainData | null) => {
    setState((prev) => ({ ...prev, customDomain: domain }));
  }, []);

  const updateSubscription = useCallback(
    (subscription: Tables<"subscriptions"> | null) => {
      setState((prev) => ({ ...prev, subscription }));
    },
    [],
  );

  const updateGithubConnection = useCallback(
    (connection: Tables<"github_connections"> | null) => {
      setState((prev) => ({ ...prev, githubConnection: connection }));
    },
    [],
  );

  const updateSelectedVersion = useCallback((version: number) => {
    selectedVersionRef.current = version;
    setState((prev) => ({ ...prev, selectedVersion: version }));
  }, []);

  const updateIsLiked = useCallback((isLiked: boolean) => {
    setState((prev) => ({ ...prev, isLiked }));
  }, []);

  const updateLastAssistantMessage = useCallback(
    (message: Tables<"messages">) => {
      setState((prev) => ({ ...prev, lastAssistantMessage: message }));
    },
    [],
  );

  return {
    ...state,
    isInitialLoading,
    selectedVersionRef,
    refreshChatData,
    refreshChat,
    updateMessages,
    updateFetchedChat,
    updateLikesCount,
    updateTitle,
    updateVisibility,
    updateCustomDomain,
    updateSubscription,
    updateGithubConnection,
    updateSelectedVersion,
    updateIsLiked,
    updateLastAssistantMessage,
  };
}
