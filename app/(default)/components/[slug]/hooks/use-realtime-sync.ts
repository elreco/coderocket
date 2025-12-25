import { useCallback, useEffect, useMemo, useRef } from "react";

import { BuildStatusPayload } from "@/context/builder-context";
import { ChatMessage } from "@/context/component-context";
import type { CustomDomainData } from "@/types/custom-domain";
import { Tables } from "@/types_db";
import { createClient } from "@/utils/supabase/client";

import { getDisplayTitle, updateDocumentTitle } from "../utils/title-utils";

interface UseRealtimeSyncOptions {
  chatId: string;
  connectedUserId: string | null | undefined;
  selectedVersion: number | undefined;
  isLoading: boolean;
  currentStreamId: string | null;
  fetchedChat: Tables<"chats"> | null;
  title: string;
  messages: ChatMessage[];
  selectedVersionRef: React.MutableRefObject<number | undefined>;
  onMessagesUpdate: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
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
  onExternalStreamDetected: (streamId: string | null) => void;
  onBuildStatusChange?: (payload: BuildStatusPayload) => void;
  onRefreshData?: () => Promise<void>;
  onPreviousArtifactFilesUpdate?: (version: number) => Promise<void>;
}

export function useRealtimeSync({
  chatId,
  connectedUserId,
  selectedVersion,
  isLoading,
  currentStreamId,
  fetchedChat,
  title,
  messages,
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
  onExternalStreamDetected,
  onBuildStatusChange,
  onRefreshData,
  onPreviousArtifactFilesUpdate,
}: UseRealtimeSyncOptions) {
  // Use useMemo to ensure stable reference - createClient is now a singleton

  const supabase = useMemo(() => createClient(), []);

  const isLoadingRef = useRef(isLoading);
  const currentStreamIdRef = useRef(currentStreamId);
  const selectedVersionStateRef = useRef(selectedVersion);
  const fetchedChatRef = useRef(fetchedChat);
  const titleRef = useRef(title);
  const messagesRef = useRef(messages);
  const onRefreshDataRef = useRef(onRefreshData);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Store callbacks in refs to avoid re-subscribing when they change
  const onMessagesUpdateRef = useRef(onMessagesUpdate);
  const onMessagesDeleteRef = useRef(onMessagesDelete);
  const onChatUpdateRef = useRef(onChatUpdate);
  const onLikesCountUpdateRef = useRef(onLikesCountUpdate);
  const onTitleUpdateRef = useRef(onTitleUpdate);
  const onVisibilityUpdateRef = useRef(onVisibilityUpdate);
  const onCustomDomainUpdateRef = useRef(onCustomDomainUpdate);
  const onSubscriptionUpdateRef = useRef(onSubscriptionUpdate);
  const onGithubConnectionUpdateRef = useRef(onGithubConnectionUpdate);
  const onSelectedVersionUpdateRef = useRef(onSelectedVersionUpdate);
  const onWebcontainerReadyUpdateRef = useRef(onWebcontainerReadyUpdate);
  const onForceBuildUpdateRef = useRef(onForceBuildUpdate);
  const onLastAssistantMessageUpdateRef = useRef(onLastAssistantMessageUpdate);
  const onExternalStreamDetectedRef = useRef(onExternalStreamDetected);
  const onBuildStatusChangeRef = useRef(onBuildStatusChange);
  const onPreviousArtifactFilesUpdateRef = useRef(
    onPreviousArtifactFilesUpdate,
  );

  // Update refs when callbacks change
  useEffect(() => {
    onPreviousArtifactFilesUpdateRef.current = onPreviousArtifactFilesUpdate;
  }, [onPreviousArtifactFilesUpdate]);

  useEffect(() => {
    onMessagesUpdateRef.current = onMessagesUpdate;
    onMessagesDeleteRef.current = onMessagesDelete;
    onChatUpdateRef.current = onChatUpdate;
    onLikesCountUpdateRef.current = onLikesCountUpdate;
    onTitleUpdateRef.current = onTitleUpdate;
    onVisibilityUpdateRef.current = onVisibilityUpdate;
    onCustomDomainUpdateRef.current = onCustomDomainUpdate;
    onSubscriptionUpdateRef.current = onSubscriptionUpdate;
    onGithubConnectionUpdateRef.current = onGithubConnectionUpdate;
    onSelectedVersionUpdateRef.current = onSelectedVersionUpdate;
    onWebcontainerReadyUpdateRef.current = onWebcontainerReadyUpdate;
    onForceBuildUpdateRef.current = onForceBuildUpdate;
    onLastAssistantMessageUpdateRef.current = onLastAssistantMessageUpdate;
    onExternalStreamDetectedRef.current = onExternalStreamDetected;
    onBuildStatusChangeRef.current = onBuildStatusChange;
  }, [
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
    onExternalStreamDetected,
    onBuildStatusChange,
  ]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    currentStreamIdRef.current = currentStreamId;
  }, [currentStreamId]);

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
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    onRefreshDataRef.current = onRefreshData;
  }, [onRefreshData]);

  // Visibility change handler - refresh data when tab becomes visible
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible" && onRefreshDataRef.current) {
      // Small delay to avoid race conditions
      setTimeout(() => {
        onRefreshDataRef.current?.();
      }, 100);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  useEffect(() => {
    // Unsubscribe from previous channel if it exists
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

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
          const newVersion = payload.new.version as number;

          // If a new message comes in with a higher version, update selectedVersion
          // This ensures all tabs follow the active generation
          if (
            newVersion > (selectedVersionStateRef.current ?? -1) &&
            !isLoadingRef.current
          ) {
            onSelectedVersionUpdateRef.current(newVersion);
            selectedVersionRef.current = newVersion;
            selectedVersionStateRef.current = newVersion;
            // Reset webcontainer ready state since new version is not built yet
            onWebcontainerReadyUpdateRef.current(false);
            // Update previousArtifactFiles for diff calculation
            if (onPreviousArtifactFilesUpdateRef.current && newVersion > 0) {
              void onPreviousArtifactFilesUpdateRef.current(newVersion);
            }
          }

          onMessagesUpdateRef.current((prev) => {
            const exists = prev.some((m) => m.id === payload.new.id);
            if (exists) return prev;
            const filteredMessages = prev.filter(
              (m) =>
                !(
                  m.id < 0 &&
                  m.role === payload.new.role &&
                  m.version === payload.new.version
                ),
            );
            return [...filteredMessages, payload.new as ChatMessage];
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
          onMessagesUpdateRef.current((prevMessages) => {
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
            onSelectedVersionUpdateRef.current(0);
            selectedVersionRef.current = 0;
            // Also update the internal ref synchronously to ensure build check works
            selectedVersionStateRef.current = 0;
            // Update previousArtifactFiles for diff calculation (version 0 has no previous)
            if (onPreviousArtifactFilesUpdateRef.current) {
              void onPreviousArtifactFilesUpdateRef.current(0);
            }
          }

          const shouldUpdateBuild =
            payload.new.version === selectedVersionStateRef.current &&
            payload.new.is_built === true &&
            !isLoadingRef.current;

          if (shouldUpdateBuild) {
            onWebcontainerReadyUpdateRef.current(true);
            onForceBuildUpdateRef.current(false);
          }

          if (
            payload.new.role === "assistant" &&
            payload.new.version === selectedVersionStateRef.current
          ) {
            onLastAssistantMessageUpdateRef.current(
              payload.new as Tables<"messages">,
            );

            // Notify build status changes
            if (onBuildStatusChangeRef.current) {
              onBuildStatusChangeRef.current({
                isBuilt: payload.new.is_built,
                buildError: payload.new.build_error,
                version: payload.new.version,
              });
            }
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
          const deletedVersion = payload.old.version as number;
          const deletedMessageId = payload.old.id as number;
          const currentVersion = selectedVersionStateRef.current ?? 0;

          // First, delete the message from the list
          onMessagesDeleteRef.current(deletedMessageId);

          // If the deleted message was from the current version, switch to previous version
          if (deletedVersion === currentVersion) {
            // Get current messages and filter out the deleted one and any from deleted version
            const currentMessages = messagesRef.current.filter(
              (m) => m.id !== deletedMessageId && m.version !== deletedVersion,
            );

            // Find the highest available version
            const availableVersions = Array.from(
              new Set(
                currentMessages
                  .filter((m) => m.version >= 0)
                  .map((m) => m.version),
              ),
            );
            const maxVersion =
              availableVersions.length > 0 ? Math.max(...availableVersions) : 0;

            if (
              maxVersion !== currentVersion ||
              availableVersions.length === 0
            ) {
              onSelectedVersionUpdateRef.current(maxVersion);
              selectedVersionRef.current = maxVersion;
              selectedVersionStateRef.current = maxVersion;
              // Reset webcontainer since we're changing version
              onWebcontainerReadyUpdateRef.current(false);

              // Refresh data to load the new version's files
              if (onRefreshDataRef.current) {
                setTimeout(() => {
                  onRefreshDataRef.current?.();
                }, 200);
              }
            }
          }
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
            onChatUpdateRef.current(updatedChat as Tables<"chats">);

            if (payload.new.likes !== undefined) {
              onLikesCountUpdateRef.current(payload.new.likes as number);
            }

            if (
              payload.new.title !== undefined &&
              payload.new.title !== titleRef.current
            ) {
              const newTitle = getDisplayTitle(
                payload.new.title as string,
                selectedVersionStateRef.current,
              );
              onTitleUpdateRef.current(newTitle);
              updateDocumentTitle(
                payload.new.title as string,
                selectedVersionStateRef.current,
              );
            }

            if (payload.new.is_private !== undefined) {
              onVisibilityUpdateRef.current(
                !(payload.new.is_private as boolean),
              );
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
                  onCustomDomainUpdateRef.current(domainData);
                }
              } catch (error) {
                console.error("Error fetching custom domain:", error);
              }
            }

            const newStreamId = payload.new.active_stream_id as string | null;
            const oldStreamId = payload.old?.active_stream_id as
              | string
              | null
              | undefined;
            if (newStreamId !== oldStreamId) {
              if (
                newStreamId &&
                newStreamId !== currentStreamIdRef.current &&
                !isLoadingRef.current
              ) {
                onExternalStreamDetectedRef.current(newStreamId);
              } else if (!newStreamId && oldStreamId) {
                onExternalStreamDetectedRef.current(null);
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
          onCustomDomainUpdateRef.current(payload.new as CustomDomainData);
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
          onCustomDomainUpdateRef.current(payload.new as CustomDomainData);
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
          onCustomDomainUpdateRef.current(null);
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
                  onSubscriptionUpdateRef.current(data);
                }
              } catch (error) {
                console.error("Error fetching subscription:", error);
              }
            } else {
              onSubscriptionUpdateRef.current(null);
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
            onGithubConnectionUpdateRef.current(
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
            onGithubConnectionUpdateRef.current(
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
            onGithubConnectionUpdateRef.current(null);
          },
        );
    }

    channelRef.current = channel;

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[RealtimeSync] Channel subscribed for chat ${chatId}`);
      } else if (status === "CHANNEL_ERROR") {
        console.error(`[RealtimeSync] Channel error for chat ${chatId}`);
        // On error, try to refresh data
        if (onRefreshDataRef.current) {
          onRefreshDataRef.current();
        }
      } else if (status === "TIMED_OUT") {
        console.warn(`[RealtimeSync] Channel timed out for chat ${chatId}`);
        // On timeout, refresh data to ensure we're in sync
        if (onRefreshDataRef.current) {
          onRefreshDataRef.current();
        }
      }
    });

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
    // Only re-subscribe when chatId or connectedUserId changes
    // All callbacks are stored in refs to avoid re-subscriptions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, connectedUserId]);
}
