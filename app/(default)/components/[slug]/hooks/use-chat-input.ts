import { useState, useCallback } from "react";

import { toast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";

interface UseChatInputProps {
  input: string;
  setInput: (value: string) => void;
  fetchedChat: Tables<"chats"> | null;
  handleSubmitToAI: (prompt: string) => void;
  setActiveTab: (tab: string) => void;
  setIsContinuingFromLengthError: (value: boolean) => void;
  chatId: string;
  improvePromptByChatId: (chatId: string, input: string) => Promise<string>;
}

export function useChatInput({
  input,
  setInput,
  fetchedChat,
  handleSubmitToAI,
  setActiveTab,
  setIsContinuingFromLengthError,
  chatId,
  improvePromptByChatId,
}: UseChatInputProps) {
  const [inputIsValid, setInputIsValid] = useState(true);
  const [hasImproved, setHasImproved] = useState(false);
  const [isImprovingLoading, setIsImprovingLoading] = useState(false);
  const [showUrlInPromptModal, setShowUrlInPromptModal] = useState(false);
  const [pendingPromptWithUrl, setPendingPromptWithUrl] = useState<
    string | null
  >(null);
  const [isCloneAnotherPageActive, setIsCloneAnotherPageActive] =
    useState(false);
  const [currentCloneUrl, setCurrentCloneUrl] = useState<string | null>(null);

  const containsUrl = useCallback((text: string): boolean => {
    const urlPattern =
      /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    return urlPattern.test(text);
  }, []);

  const submitPrompt = useCallback(
    (promptText: string) => {
      handleSubmitToAI(promptText);
      setActiveTab("chat");
    },
    [handleSubmitToAI, setActiveTab],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!input.trim()) {
        toast({
          variant: "destructive",
          title: "Empty input",
          description: "Please enter a prompt before submitting",
          duration: 4000,
        });
        return;
      }

      if (!inputIsValid) {
        toast({
          variant: "destructive",
          title: "Prompt is too long",
          description: `Your prompt exceeds the character limit. Please shorten it to continue.`,
          duration: 4000,
        });
        return;
      }

      setIsContinuingFromLengthError(false);

      if (fetchedChat?.clone_url && containsUrl(input)) {
        setPendingPromptWithUrl(input);
        setShowUrlInPromptModal(true);
        return;
      }

      submitPrompt(input);
    },
    [
      input,
      inputIsValid,
      fetchedChat?.clone_url,
      containsUrl,
      setIsContinuingFromLengthError,
      submitPrompt,
    ],
  );

  const handleImprovePrompt = useCallback(async () => {
    if (isImprovingLoading) return;
    if (!input) {
      toast({
        variant: "destructive",
        title: "Prompt is empty",
        description: "Please enter a prompt before improving it.",
        duration: 4000,
      });
      setIsImprovingLoading(false);
      return;
    }
    try {
      setIsImprovingLoading(true);
      const improvedPrompt = await improvePromptByChatId(chatId, input);
      setInput(improvedPrompt);
      setHasImproved(true);
      setIsImprovingLoading(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not premium, the visibility cannot be changed. Please upgrade to premium and try again.",
        duration: 4000,
      });
      setIsImprovingLoading(false);
    }
  }, [isImprovingLoading, input, chatId, setInput, improvePromptByChatId]);

  const resetHasImproved = useCallback(() => {
    setHasImproved(false);
  }, []);

  const dismissUrlModal = useCallback(() => {
    setShowUrlInPromptModal(false);
    setPendingPromptWithUrl(null);
  }, []);

  const confirmUrlModalSubmit = useCallback(() => {
    if (pendingPromptWithUrl) {
      submitPrompt(pendingPromptWithUrl);
    }
    dismissUrlModal();
  }, [pendingPromptWithUrl, submitPrompt, dismissUrlModal]);

  return {
    inputIsValid,
    setInputIsValid,
    hasImproved,
    setHasImproved,
    isImprovingLoading,
    showUrlInPromptModal,
    setShowUrlInPromptModal,
    pendingPromptWithUrl,
    setPendingPromptWithUrl,
    isCloneAnotherPageActive,
    setIsCloneAnotherPageActive,
    currentCloneUrl,
    setCurrentCloneUrl,
    containsUrl,
    submitPrompt,
    handleSubmit,
    handleImprovePrompt,
    resetHasImproved,
    dismissUrlModal,
    confirmUrlModalSubmit,
  };
}
