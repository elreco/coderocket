import { useCallback, useEffect, useRef } from "react";

import { ChatMessage } from "@/context/component-context";
import { Tables } from "@/types_db";

import { buildComponent } from "../actions";

interface UseStreamResumeOptions {
  chatId: string;
  fetchedChat: Tables<"chats"> | null;
  messages: ChatMessage[];
  selectedVersion: number | undefined;
  onSetIsResuming: (value: boolean) => void;
  onSetIsLoading: (value: boolean) => void;
  onSetIsSubmitting: (value: boolean) => void;
  onSetCanvas: (value: boolean) => void;
  onSetCompletion: (value: string) => void;
  onSetIsScrapingWebsite: (value: boolean) => void;
  onStartGeneration: (prompt: string) => void;
  refreshChatData: () => Promise<ChatMessage[] | undefined>;
}

export function useStreamResume({
  chatId,
  fetchedChat,
  messages,
  selectedVersion,
  onSetIsResuming,
  onSetIsLoading,
  onSetIsSubmitting,
  onSetCanvas,
  onSetCompletion,
  onSetIsScrapingWebsite,
  onStartGeneration,
  refreshChatData,
}: UseStreamResumeOptions) {
  const hasAttemptedResumeRef = useRef<Record<string, boolean>>({});
  const hasInitiatedRef = useRef<Record<string, boolean>>({});
  const setCompletionRef = useRef<((value: string) => void) | null>(null);
  const refreshChatDataRef = useRef<
    (() => Promise<ChatMessage[] | undefined>) | null
  >(null);
  const startInitialGenerationRef = useRef<((prompt: string) => void) | null>(
    null,
  );

  useEffect(() => {
    setCompletionRef.current = onSetCompletion;
  }, [onSetCompletion]);

  useEffect(() => {
    refreshChatDataRef.current = refreshChatData;
  }, [refreshChatData]);

  useEffect(() => {
    startInitialGenerationRef.current = onStartGeneration;
  }, [onStartGeneration]);

  const tryResumeStream = useCallback(async (): Promise<boolean> => {
    if (hasAttemptedResumeRef.current[chatId]) {
      return false;
    }
    hasAttemptedResumeRef.current[chatId] = true;

    try {
      const response = await fetch(`/api/components/${chatId}/stream`);
      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();

        if (data.needsBuild && data.version !== null) {
          try {
            await buildComponent(chatId, data.version);
            if (refreshChatDataRef.current) {
              await refreshChatDataRef.current();
            }
            return true;
          } catch {
            return false;
          }
        }
        return false;
      }

      if (!response.ok) {
        return false;
      }

      onSetIsResuming(true);
      onSetIsLoading(true);
      onSetCanvas(true);

      const reader = response.body?.getReader();
      if (!reader) {
        onSetIsResuming(false);
        return false;
      }

      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        if (setCompletionRef.current) {
          setCompletionRef.current(accumulatedText);
        }
      }

      onSetIsResuming(false);
      onSetIsLoading(false);
      onSetIsSubmitting(false);

      if (refreshChatDataRef.current) {
        const refreshedMessages = await refreshChatDataRef.current();

        if (refreshedMessages) {
          const lastAssistant = refreshedMessages
            .filter((m) => m.role === "assistant")
            .sort((a, b) => b.version - a.version)[0];

          if (lastAssistant && !lastAssistant.is_built) {
            try {
              await buildComponent(chatId, lastAssistant.version);
            } catch {
              // Build failed silently
            }
          }
        }
      }

      return true;
    } catch {
      onSetIsResuming(false);
      return false;
    }
  }, [chatId, onSetIsResuming, onSetIsLoading, onSetCanvas, onSetIsSubmitting]);

  useEffect(() => {
    hasInitiatedRef.current = {};
  }, [chatId]);

  useEffect(() => {
    if (!fetchedChat || !messages.length) return;

    const lastUserMsg = messages.find(
      (m) => m.role === "user" && m.version === selectedVersion,
    );
    const lastAssistantMsg = messages.find(
      (m) => m.role === "assistant" && m.version === selectedVersion,
    );

    const needsGeneration =
      messages.length === 1 && lastUserMsg && !lastAssistantMsg;

    const isIncomplete =
      lastAssistantMsg?.content &&
      !lastAssistantMsg.content.includes("<!-- FINISH_REASON:");

    const needsBuild =
      lastAssistantMsg &&
      lastAssistantMsg.content &&
      (lastAssistantMsg.is_built === false ||
        lastAssistantMsg.is_built === null) &&
      (lastAssistantMsg.is_building === false ||
        lastAssistantMsg.is_building === null) &&
      !lastAssistantMsg.build_error;

    if (needsBuild) {
      console.log(
        `[useStreamResume] Build needed detected for version ${lastAssistantMsg.version}`,
        {
          hasContent: !!lastAssistantMsg.content,
          is_built: lastAssistantMsg.is_built,
          is_building: lastAssistantMsg.is_building,
          build_error: lastAssistantMsg.build_error,
        },
      );
    }

    if (!needsGeneration && !isIncomplete && !needsBuild) {
      console.log(`[useStreamResume] No action needed`, {
        needsGeneration,
        isIncomplete,
        needsBuild,
      });
      return;
    }
    if (hasInitiatedRef.current[chatId]) {
      console.log(`[useStreamResume] Already initiated for chat ${chatId}`);
      return;
    }

    hasInitiatedRef.current[chatId] = true;

    const attemptResumeOrStart = async () => {
      const resumed = await tryResumeStream();

      if (!resumed && needsBuild && lastAssistantMsg) {
        console.log(
          `[useStreamResume] Build needed for version ${lastAssistantMsg.version}, triggering...`,
        );
        try {
          await buildComponent(chatId, lastAssistantMsg.version);
          console.log(
            `[useStreamResume] Build triggered successfully for version ${lastAssistantMsg.version}`,
          );
          if (refreshChatDataRef.current) {
            await refreshChatDataRef.current();
          }
        } catch (error) {
          console.error(
            `[useStreamResume] Build error for version ${lastAssistantMsg.version}:`,
            error,
          );
        }
      }

      if (!resumed && needsGeneration && startInitialGenerationRef.current) {
        onSetIsLoading(true);
        onSetIsSubmitting(true);
        const isFirstVersion = (lastUserMsg?.version ?? 0) <= 0;
        if (fetchedChat.clone_url && isFirstVersion) {
          onSetIsScrapingWebsite(true);
        }
        startInitialGenerationRef.current(lastUserMsg?.content || "");
      }
    };

    attemptResumeOrStart();
  }, [
    chatId,
    fetchedChat,
    messages,
    selectedVersion,
    tryResumeStream,
    onSetIsLoading,
    onSetIsSubmitting,
    onSetIsScrapingWebsite,
  ]);

  return {
    hasAttemptedResumeRef,
    hasInitiatedRef,
    setCompletionRef,
    refreshChatDataRef,
    startInitialGenerationRef,
    tryResumeStream,
  };
}
