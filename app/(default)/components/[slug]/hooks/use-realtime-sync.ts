import { useEffect, useRef } from "react";

import { ChatMessage } from "@/context/component-context";
import type { CustomDomainData } from "@/types/custom-domain";
import { Tables } from "@/types_db";
import { createClient } from "@/utils/supabase/client";

interface UseRealtimeSyncOptions {
  chatId: string;
  connectedUserId: string | null | undefined;
  selectedVersion: number | undefined;
  isLoading: boolean;
  fetchedChat: Tables<"chats"> | null;
  title: string;
  selectedVersionRef: React.MutableRefObject<number | undefined>;
  onMessagesUpdate: (
    updater: (prev: ChatMessage[]) => ChatMessage[],
  ) => void;
  onMessagesDelete: (messageId: number) => void;
  onChatUpdate: (chat: Tables<"chats">) => void;
  onLikesCountUpdate: (count: number) => void;
  onTitleUpdate: (title: string) => void;
  onVisibilityUpdate: (isVisible: boolean) => void;
  onCustomDomainUpdate: (domain: CustomDomainData | null) => void;
  onSubscriptionUpdate: (subscription: Tables<"subscriptions"> | null) => void;
  onGithubConnectionUpdate: (
    connection: Tables<"github_connections"> | null,
  ) => void;
  onSelectedVersionUpdate: (version: number) => void;
  onWebcontainerReadyUpdate: (ready: boolean) => void;
  onForceBuildUpdate: (force: boolean) => void;
  onLastAssistantMessageUpdate: (message: Tables<"messages">) => void;
}

export function useRealtimeSync({
  chatId,
  connectedUserId,
  selectedVersion,
  isLoading,
  fetchedChat,
  title,
  selectedVersionRef,
  onMessagesUpdate,
  onMessagesDelete,
  onChatUpdate,
  onLikesCountUpdate,
  onTitleUpdate,
  onVisibilityUpdate,
  onCustomDomainUpdate,
  onSubscriptionUpdate,
  onGithubConnectionUpdate,
  onSelectedVersionUpdate,
  onWebcontainerReadyUpdate,
  onForceBuildUpdate,
  onLastAssistantMessageUpdate,
}: UseRealtimeSyncOptions) {
  const supabase = createClient();

  const isLoadingRef = useRef(isLoading);
  const selectedVersionStateRef = useRef(selectedVersion);
  const fetchedChatRef = useRef(fetchedChat);
  const titleRef = useRef(title);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    selectedVersionStateRef.current = selectedVersion;
  }, [selectedVersion]);

  useEffect(() => {
    fetchedChatRef.current = fetchedChat;
  }, [fetchedChat]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    const channel = supabase
      .channel(`component-sync-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          if (isLoadingRef.current) return;
          onMessagesUpdate((prev) => {
            const exists = prev.some((m) => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new as ChatMessage];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          onMessagesUpdate((prevMessages) => {
            const existingIndex = prevMessages.findIndex(
              (m) => m.id === payload.new.id,
            );
            if (existingIndex >= 0) {
              return prevMessages.map((message) =>
                message.id === payload.new.id
                  ? { ...message, ...payload.new }
                  : message,
              );
            } else {
              const filteredMessages = prevMessages.filter(
                (m) =>
                  !(
                    m.id < 0 &&
                    m.role === payload.new.role &&
                    m.version === payload.new.version
                  ),
              );
              return [...filteredMessages, payload.new as ChatMessage];
            }
          });

          if (
            (payload.old.version === -1 || payload.old.version === undefined) &&
            payload.new.version === 0
          ) {
            onSelectedVersionUpdate(0);
            selectedVersionRef.current = 0;
          }

          if (
            payload.new.version === selectedVersionStateRef.current &&
            payload.new.is_built === true &&
            !isLoadingRef.current
          ) {
            onWebcontainerReadyUpdate(true);
            onForceBuildUpdate(false);
          }

          if (
            payload.new.role === "assistant" &&
            payload.new.version === selectedVersionStateRef.current &&
            payload.new.screenshot &&
            payload.new.screenshot !== payload.old?.screenshot
          ) {
            onLastAssistantMessageUpdate(payload.new as Tables<"messages">);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          onMessagesDelete(payload.old.id);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chats",
          filter: `id=eq.${chatId}`,
        },
        async (payload) => {
          const currentChat = fetchedChatRef.current;
          if (currentChat) {
            const updatedChat = { ...currentChat, ...payload.new };
            onChatUpdate(updatedChat as Tables<"chats">);

            if (payload.new.likes !== undefined) {
              onLikesCountUpdate(payload.new.likes as number);
            }

            if (
              payload.new.title !== undefined &&
              payload.new.title !== titleRef.current
            ) {
              const newTitle =
                (payload.new.title as string) ||
                `Version #${selectedVersionStateRef.current ?? 0}`;
              onTitleUpdate(newTitle);
              document.title = `${newTitle} - CodeRocket`;
            }

            if (payload.new.is_private !== undefined) {
              onVisibilityUpdate(!(payload.new.is_private as boolean));
            }

            if (
              payload.new.is_deployed !== undefined &&
              payload.new.is_deployed
            ) {
              try {
                const { data: domainData } = await supabase
                  .from("custom_domains")
                  .select("*")
                  .eq("chat_id", chatId)
                  .maybeSingle();
                if (domainData) {
                  onCustomDomainUpdate(domainData);
                }
              } catch (error) {
                console.error("Error fetching custom domain:", error);
              }
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "custom_domains",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          onCustomDomainUpdate(payload.new as CustomDomainData);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "custom_domains",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          onCustomDomainUpdate(payload.new as CustomDomainData);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "custom_domains",
          filter: `chat_id=eq.${chatId}`,
        },
        async () => {
          onCustomDomainUpdate(null);
        },
      );

    if (connectedUserId) {
      channel
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "subscriptions",
            filter: `user_id=eq.${connectedUserId}`,
          },
          async (payload) => {
            if (
              payload.new.status === "active" ||
              payload.new.status === "trialing"
            ) {
              try {
                const { data } = await supabase
                  .from("subscriptions")
                  .select("*, prices(*, products(*))")
                  .eq("id", payload.new.id)
                  .maybeSingle();
                if (data) {
                  onSubscriptionUpdate(data);
                }
              } catch (error) {
                console.error("Error fetching subscription:", error);
              }
            } else {
              onSubscriptionUpdate(null);
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "github_connections",
            filter: `user_id=eq.${connectedUserId}`,
          },
          async (payload) => {
            onGithubConnectionUpdate(
              payload.new as Tables<"github_connections">,
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "github_connections",
            filter: `user_id=eq.${connectedUserId}`,
          },
          async (payload) => {
            onGithubConnectionUpdate(
              payload.new as Tables<"github_connections">,
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "github_connections",
            filter: `user_id=eq.${connectedUserId}`,
          },
          async () => {
            onGithubConnectionUpdate(null);
          },
        );
    }

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [
    chatId,
    connectedUserId,
    supabase,
    selectedVersionRef,
    onMessagesUpdate,
    onMessagesDelete,
    onChatUpdate,
    onLikesCountUpdate,
    onTitleUpdate,
    onVisibilityUpdate,
    onCustomDomainUpdate,
    onSubscriptionUpdate,
    onGithubConnectionUpdate,
    onSelectedVersionUpdate,
    onWebcontainerReadyUpdate,
    onForceBuildUpdate,
    onLastAssistantMessageUpdate,
  ]);
}
