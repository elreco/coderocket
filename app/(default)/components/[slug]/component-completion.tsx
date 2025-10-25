"use client";

import { useCompletion } from "@ai-sdk/react";
import { Crisp } from "crisp-sdk-web";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Fullscreen,
  Layers,
  Loader,
  Settings,
  ExternalLink,
  Copy,
  GitFork,
  Eye,
  Code as CodeIcon,
  X,
  Heart,
  Globe,
  Info,
  Share,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
import RenderHtmlComponent from "@/components/renders/render-html-component";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChatMessage,
  ComponentContext,
  WebcontainerLoadingState,
} from "@/context/component-context";
import { WebcontainerProvider } from "@/context/webcontainer-context";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";
import {
  ChatFile,
  extractFilesFromArtifact,
  extractFilesFromCompletion,
  getUpdatedArtifactCode,
} from "@/utils/completion-parser";
import {
  Framework,
  MAX_VERSIONS_PER_COMPONENT,
  TRIAL_PLAN_MESSAGES_PER_MONTH,
  crispWebsiteId,
  getMaxMessagesPerPeriod,
} from "@/utils/config";
import { getArtifactCodeByVersion } from "@/utils/supabase/artifact-helpers";
import { createClient } from "@/utils/supabase/client";

import {
  fetchChatById,
  fetchLastAssistantMessageByChatId,
  fetchLastUserMessageByChatId,
  fetchMessagesByChatId,
  hasUserLikedChat,
  toggleChatLike,
  remixChat,
} from "../actions";

import ComponentSettings from "./(settings)/component-settings";
import CodePreview from "./code-preview";
import ComponentSidebar from "./component-sidebar";

interface Props {
  chatId: string;
  authorized: boolean;
  user: Tables<"users"> | null;
}

export default function ComponentCompletion({
  chatId,
  authorized,
  user,
}: Props) {
  const supabase = createClient();
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  const router = useRouter();
  const { setOpen: setSidebarOpen } = useSidebar();
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(
    undefined,
  );
  const [title, setTitle] = useState<string>("");
  const [isCanvas, setCanvas] = useState(true);
  const [isVisible, setVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editorValue, setEditorValue] = useState("");
  const [isWebcontainerReady, setWebcontainerReady] = useState(false);
  const [loadingState, setLoadingState] =
    useState<WebcontainerLoadingState>(null);

  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const [artifactFiles, setArtifactFiles] = useState<ChatFile[]>([]);

  const [artifactCode, setArtifactCode] = useState("");

  const [activeTab, setActiveTab] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [forceBuild, setForceBuild] = useState(false);
  const [isLengthError, setIsLengthError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fetchedChat, setFetchedChat] = useState<Tables<"chats"> | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] =
    useState<Tables<"messages"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isLiked, setIsLiked] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const uploadFilesRef = useRef<File[]>([]);
  const [defaultImage, setDefaultImage] = useState<string | null>(null);
  const [defaultFiles, setDefaultFiles] = useState<string[]>([]);

  useEffect(() => {
    uploadFilesRef.current = uploadFiles;
  }, [uploadFiles]);

  useEffect(() => {
    setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [remixOriginalChat, setRemixOriginalChat] =
    useState<Tables<"chats"> | null>(null);

  const [isRemixing, setIsRemixing] = useState(false);
  const [subscription, setSubscription] =
    useState<Tables<"subscriptions"> | null>(null);

  const [isRemixModalOpen, setIsRemixModalOpen] = useState(false);
  const [hasAlreadyRemixed, setHasAlreadyRemixed] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      const [chat, assistantMsg, userMsg, msgs, hasLiked] = await Promise.all([
        fetchChatById(chatId),
        fetchLastAssistantMessageByChatId(chatId),
        fetchLastUserMessageByChatId(chatId),
        fetchMessagesByChatId(chatId, false),
        hasUserLikedChat(chatId),
      ]);
      if (!chat) {
        return;
      }
      setIsLiked(hasLiked);
      setFetchedChat(chat);
      setLastAssistantMessage(assistantMsg);
      setMessages(msgs || []);
      setSelectedVersion(userMsg?.version || 0);
      setTitle(
        chat.title ||
          `Version #${userMsg?.version && userMsg.version > -1 ? userMsg.version : 0}`,
      );
      setVisible(!chat.is_private);
      setArtifactCode(chat.artifact_code || "");
      setWebcontainerReady(assistantMsg?.is_built || false);
      if (
        assistantMsg?.content?.includes("<!-- FINISH_REASON: length -->") ||
        assistantMsg?.content?.includes("<!-- FINISH_REASON: error -->")
      ) {
        setIsLengthError(true);
      } else {
        setIsLengthError(false);
      }

      if (msgs?.length === 1) {
        setCanvas(false);
        complete(userMsg?.content || "");
        setInput(userMsg?.content || "");
        setDefaultImage(userMsg?.prompt_image || null);

        const filesFromMsg = userMsg?.files
          ? Array.isArray(userMsg.files)
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              userMsg.files.map((f: any) => f?.url)
            : []
          : userMsg?.prompt_image
            ? [userMsg.prompt_image]
            : [];
        setDefaultFiles(filesFromMsg);

        setIsLoading(true);
        return;
      }
      if (
        chat?.framework !== Framework.HTML &&
        chat.artifact_code &&
        assistantMsg?.content
      ) {
        const newArtifactFiles = extractFilesFromArtifact(
          chat.artifact_code || "",
        );
        setArtifactFiles(newArtifactFiles);
        const firstFile = newArtifactFiles[0];
        if (!firstFile) {
          setEditorValue("");
          setActiveTab("");
          return;
        }
        setEditorValue(firstFile.content);
        setActiveTab(firstFile.name || "");
      }
      if (chat?.framework === Framework.HTML && assistantMsg?.content) {
        handleChatFiles(assistantMsg.content, true);
      }

      // Fetch original chat if this is a remix
      if (chat.remix_chat_id) {
        const originalChat = await fetchChatById(chat.remix_chat_id);
        if (originalChat) {
          setRemixOriginalChat(originalChat);
        }
        setHasAlreadyRemixed(true);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsLoading(false);
    };
    loadInitialData();
    checkSubscriptionStatus();
  }, [chatId]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    const sub = await getSubscription();
    setSubscription(sub);
  };

  const { completion, stop, complete, setCompletion, input, setInput } =
    useCompletion({
      api: "/api/components",
      fetch: async (url, options) => {
        const requestBody = JSON.parse((options?.body as string) || "{}");
        const promptValue = requestBody.prompt || input;

        const currentFiles = uploadFilesRef.current;

        const formData = new FormData();
        currentFiles.forEach((file) => {
          formData.append("files", file);
        });
        formData.append("id", chatId);
        formData.append("selectedVersion", String(selectedVersion));
        formData.append("prompt", promptValue);

        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || "An unknown error occurred");
          } catch (e) {
            if (e instanceof Error) {
              throw e;
            }

            // If we can't parse as JSON, try to get the text
            const text = await response.text();
            throw new Error(text || "An unknown error occurred");
          }
        }

        return response;
      },
      streamProtocol: "text",
      initialCompletion: lastAssistantMessage?.content,
      experimental_throttle: 500,
      onError: async (error: Error) => {
        setIsSubmitting(false);
        const newArtifactFiles = extractFilesFromArtifact(
          fetchedChat?.artifact_code || "",
        );
        setArtifactFiles(newArtifactFiles);
        if (error.message === "payment-required-for-image") {
          router.push("/pricing");
          toast({
            variant: "destructive",
            title: "You can't upload images with a free plan",
            description: "Please upgrade to continue.",
            duration: 4000,
          });
          return;
        }
        if (error.message === "more-than-x-versions") {
          toast({
            variant: "destructive",
            title: `You can't have more than ${MAX_VERSIONS_PER_COMPONENT} versions`,
            description: "Please remix your component instead.",
            duration: 4000,
          });
          return;
        }
        if (error.message === "limit-exceeded") {
          const subscription = await getSubscription();
          if (!subscription) {
            // Utiliser le premier jour du mois en cours comme période de départ
            const today = new Date();
            const currentPeriodStart = new Date(
              today.getFullYear(),
              today.getMonth(),
              1,
            );
            const maxMessagesPerPeriod = TRIAL_PLAN_MESSAGES_PER_MONTH;
            // Définir la date de réinitialisation au premier jour du mois prochain
            const resetDate = new Date(
              today.getFullYear(),
              today.getMonth() + 1,
              1,
            );

            // Utiliser currentPeriodStart dans le message pour indiquer la période en cours
            const currentPeriodFormatted = format(
              currentPeriodStart,
              "d MMMM yyyy",
            );

            setIsLoading(false);
            setCanvas(true);
            toast({
              variant: "destructive",
              title: "Monthly message limit reached",
              description: (
                <div>
                  <p>
                    You have reached your limit of {maxMessagesPerPeriod / 2}{" "}
                    versions for this month (starting {currentPeriodFormatted}).
                    This limit will reset next month (
                    {format(resetDate, "d MMMM yyyy")}).
                  </p>
                  <div className="mt-2 flex flex-col space-y-2">
                    <Button
                      onClick={() => router.push("/pricing")}
                      className="w-full"
                    >
                      Upgrade to a paid plan
                    </Button>
                    <Button
                      onClick={() => router.push("/account?buy_extra=true")}
                      variant="outline"
                      className="w-full"
                    >
                      Buy extra versions ($1 each)
                    </Button>
                  </div>
                </div>
              ),
              duration: 10000,
            });
            return;
          }
          const maxMessagesPerPeriod = getMaxMessagesPerPeriod(subscription);
          const currentPeriodStart = new Date(
            subscription.current_period_start,
          );
          const resetDate = format(
            new Date(
              currentPeriodStart.getFullYear(),
              currentPeriodStart.getMonth() + 1,
              1,
            ),
            "d MMMM yyyy",
          );
          setIsLoading(false);
          setCanvas(true);
          toast({
            variant: "destructive",
            title: "You have reached the limit of your plan",
            description: (
              <div>
                <p>
                  You have reached your limit of {maxMessagesPerPeriod / 2}{" "}
                  versions for {subscription.prices?.interval}. This limit will
                  reset on {resetDate}.
                </p>
                <div className="mt-2 flex flex-col space-y-2">
                  <Button
                    onClick={() => router.push("/account")}
                    className="w-full"
                  >
                    Go to My Account
                  </Button>
                  <Button
                    onClick={() => router.push("/account?buy_extra=true")}
                    variant="outline"
                    className="w-full"
                  >
                    Buy extra versions ($1 each)
                  </Button>
                </div>
              </div>
            ),
            duration: 10000,
          });

          return;
        }
        if (error.message) {
          setIsLoading(false);
          setCanvas(true);
          toast({
            variant: "destructive",
            title: "Something went wrong",
            description: error.message,
            duration: 4000,
          });
        }
      },
      onFinish: async () => {
        try {
          setIsSubmitting(false);
          await refreshChatData();
          const refreshedLastAssistantMessage =
            await fetchLastAssistantMessageByChatId(chatId);

          if (refreshedLastAssistantMessage) {
            handleVersionSelect(refreshedLastAssistantMessage.version);

            // Check if we have a special marker for finish reason
            const content = refreshedLastAssistantMessage.content || "";
            if (content.includes("<!-- FINISH_REASON: length -->")) {
              setIsLengthError(true);
              toast({
                variant: "default",
                title: "Continue your work",
                description: `The AI reached its token limit. No worries, you can continue by clicking the "Continue your work" button and iterate again.`,
                duration: 6000,
              });

              // Remove the marker from the content
              const cleanedContent = content.replace(
                "\n\n<!-- FINISH_REASON: length -->",
                "",
              );
              setCompletion(cleanedContent);
            } else if (content.includes("<!-- FINISH_REASON: error -->")) {
              setIsLengthError(true);
              toast({
                variant: "destructive",
                title: "Something went wrong",
                description: "An error occurred during generation",
                duration: 4000,
              });

              // Remove the marker from the content
              const cleanedContent = content.replace(
                "\n\n<!-- FINISH_REASON: error -->",
                "",
              );
              setCompletion(cleanedContent);
            } else {
              setIsLengthError(false);
            }
          } else {
            // Handle case where no assistant message was generated
            console.error(
              "No assistant message generated - AI generation may have failed",
            );
            setIsLengthError(true);
            toast({
              variant: "destructive",
              title: "Generation failed",
              description:
                "The AI failed to generate content. This may be due to prompt complexity. Please try again or simplify your request.",
              duration: 6000,
            });
          }

          setCanvas(true);
          setInput("");
          await new Promise((resolve) => setTimeout(resolve, 500));
          setIsLoading(false);
          setUploadFiles([]);
        } catch (error) {
          console.error("Error in onFinish:", error);
          setIsLoading(false);
          setIsSubmitting(false);
          setCanvas(true);
        }
      },
    });

  const handleSubmitToAI = (inputData: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setForceBuild(true);
    setCompletion("");
    setArtifactFiles([]);
    setWebcontainerReady(false);
    setChatFiles([]);
    setCanvas(false);
    setIsLoading(true);
    complete(inputData);
  };

  const handleVersionSelect = (version: number, tabName?: string) => {
    // If we're just changing tabs on the same version, don't trigger a rebuild
    const isTabChangeOnly = version === selectedVersion && tabName;

    if (!isTabChangeOnly) {
      setSelectedVersion(version);
    }

    const selectedMessages = messages.filter((m) => m.version == version);
    if (selectedMessages.length !== 2) {
      return;
    }

    const selectedAssistantMessage = selectedMessages.find(
      (m) => m.role === "assistant",
    );
    if (!selectedAssistantMessage?.content) {
      return;
    }

    // Only update these states if version actually changed
    if (!isTabChangeOnly) {
      if (
        selectedAssistantMessage.content.includes(
          "<!-- FINISH_REASON: length -->",
        ) ||
        selectedAssistantMessage.content.includes(
          "<!-- FINISH_REASON: error -->",
        )
      ) {
        setIsLengthError(true);
      } else {
        setIsLengthError(false);
      }

      setCompletion(selectedAssistantMessage.content);
    }

    // Use the message's artifact_code if available, otherwise calculate it
    if (selectedAssistantMessage.artifact_code) {
      // Only update artifact files if version changed
      if (!isTabChangeOnly) {
        // Set the artifact code from the message
        setArtifactCode(selectedAssistantMessage.artifact_code);

        // Extract files from the artifact code
        const newArtifactFiles = extractFilesFromArtifact(
          selectedAssistantMessage.artifact_code,
        );
        setArtifactFiles(newArtifactFiles);
        // Handle file selection
        const files = extractFilesFromCompletion(
          selectedAssistantMessage.content,
        );
        if (files.length > 0) {
          setChatFiles(files);
        } else {
          setChatFiles([]);
        }
      }

      // Always handle tab selection (whether version changed or not)
      const currentFiles = isTabChangeOnly
        ? artifactFiles
        : extractFilesFromArtifact(selectedAssistantMessage.artifact_code);

      if (tabName) {
        const file = currentFiles.find((file) => file.name === tabName);
        if (file) {
          setEditorValue(file.content);
          setActiveTab(tabName);
          setCanvas(false);
        }
      } else if (!isTabChangeOnly) {
        // Select appropriate file to display only if version changed
        const activeFile =
          currentFiles.find((file) => file.isActive) || currentFiles[0];
        if (activeFile) {
          setEditorValue(activeFile.content);
          setActiveTab(activeFile.name || "");
          setCanvas(true);
        }
      }
    }

    // Only update webcontainer ready state if version changed
    if (!isTabChangeOnly) {
      // Always check latest build status and force rebuild if needed
      // When versions are deleted, all builds become invalid
      const shouldBeReady = selectedAssistantMessage.is_built && !forceBuild;
      setWebcontainerReady(shouldBeReady || false);
    }
  };

  const share = () => {
    const link =
      fetchedChat?.framework === Framework.HTML
        ? `https://www.coderocket.app/content/${chatId}/${selectedVersion}`
        : isWebcontainerReady
          ? `https://${chatId}-${selectedVersion}.preview.coderocket.app`
          : window.location.href;
    setShareLink(link);
    setIsShareModalOpen(true);
    copy(link);
    toast({
      variant: "default",
      title: "Successfully copied",
      description: "The URL has been successfully saved to your clipboard",
      duration: 4000,
    });
  };

  const refreshChatData = async () => {
    const refreshedChatMessages = await fetchMessagesByChatId(chatId, false);
    if (!refreshedChatMessages) return;
    setMessages(refreshedChatMessages);
    const refreshedChat = await fetchChatById(chatId);
    if (!refreshedChat) return;
    setFetchedChat(refreshedChat);
    // Always get artifact code from the selected version, not from chats table
    const artifactCodeFromVersion = await getArtifactCodeByVersion(
      chatId,
      selectedVersion,
    );
    setArtifactCode(artifactCodeFromVersion || "");
    const title = refreshedChat.title || `Version #${selectedVersion}`;
    setTitle(title);
    document.title = `${title} - CodeRocket`;
    return refreshedChatMessages;
  };

  const handleChatFiles = (
    _completion: string,
    isFirstRun?: boolean,
    tabName?: string,
  ) => {
    const newArtifactCode = getUpdatedArtifactCode(_completion, artifactCode);
    const newArtifactFiles = extractFilesFromArtifact(
      newArtifactCode,
      artifactCode,
      _completion, // Pass current completion to detect active file
    );
    setArtifactFiles(newArtifactFiles);

    const files = extractFilesFromCompletion(_completion);

    if (files.length > 0) {
      setChatFiles(files);
    } else {
      setChatFiles([]);
    }
    if (tabName) {
      const file = newArtifactFiles.find((file) => file.name === tabName);

      if (!file) {
        setEditorValue("");
        setActiveTab("");
        return;
      }
      setEditorValue(file.content);
      setActiveTab(tabName);
      setCanvas(false);
      return;
    }

    if (isFirstRun) {
      const firstFile = newArtifactFiles[0];
      if (!firstFile) {
        setEditorValue("");
        setActiveTab("");
        return;
      }
      setEditorValue(firstFile.content);
      setActiveTab(firstFile.name || "");
      setCanvas(true);
      return;
    }
    if (!newArtifactFiles.length) {
      return;
    }
    const activeFile = newArtifactFiles.find((file) => file.isActive);

    if (!activeFile) {
      return;
    }
    setEditorValue(activeFile.content);
    setActiveTab(activeFile.name || "");
    if (!isLoading) {
      setCanvas(true);
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        stop();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  });

  useEffect(() => {
    if (isLoading) {
      handleChatFiles(completion);
    }
  }, [completion]);

  useEffect(() => {
    Crisp.configure(crispWebsiteId);

    if (isModalOpen) {
      Crisp.chat.hide();
    }
  }, [isModalOpen]);

  const handleFullscreenToggle = (isOpen: boolean) => {
    setIsModalOpen(isOpen);
  };

  const handleLikeClick = async () => {
    const { data: user, error } = await supabase.auth.getUser();

    if (error || !user) {
      toast({
        title: "Can't like component",
        description: "Please login to like a component",
        duration: 4000,
      });
      return;
    }

    setIsLiked(!isLiked);
    toggleChatLike(chatId);
  };

  const handleRemixClick = async () => {
    if (isRemixing) return;
    if (!subscription) {
      toast({
        variant: "destructive",
        title: "Subscription required",
        description:
          "Only subscribers can remix projects. Please upgrade to create remixes.",
        duration: 4000,
      });
      setIsRemixing(false);
      return;
    }

    try {
      setIsRemixing(true);
      const newChat = await remixChat(chatId, selectedVersion);

      toast({
        variant: "default",
        title: "Project remixed",
        description: "Your remix has been created successfully!",
        duration: 4000,
      });

      // Redirect to the new chat
      router.push(`/components/${newChat.slug}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Remix failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create remix. Please try again.",
        duration: 4000,
      });
      setIsRemixing(false);
    }
  };

  const contextValue = {
    isCanvas,
    setCanvas,
    isLoading,
    selectedVersion,
    chatFiles,
    activeTab,
    editorValue,
    handleVersionSelect,
    authorized,
    completion,
    messages,
    user,
    handleChatFiles,
    refreshChatData,
    isVisible,
    setVisible,
    input,
    setInput,
    handleSubmitToAI,
    setCompletion,
    artifactCode,
    setArtifactCode,
    chatId,
    artifactFiles,
    selectedFramework: (fetchedChat?.framework || "react") as Framework,
    isWebcontainerReady,
    setWebcontainerReady,
    forceBuild,
    setForceBuild,
    files: uploadFiles,
    setFiles: setUploadFiles,
    defaultImage,
    defaultFiles,
    loadingState,
    setLoadingState,
    fetchedChat,
    isLengthError,
  };

  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          setMessages((prevMessages) =>
            prevMessages.map((message) =>
              message.id === payload.new.id
                ? { ...message, ...payload.new }
                : message,
            ),
          );

          // Check if this message is for the selected version and if is_built is true
          if (
            payload.new.version === selectedVersion &&
            payload.new.is_built === true &&
            !isLoading
          ) {
            setWebcontainerReady(true);
            setForceBuild(false); // Reset force build flag when build is complete
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedVersion, isLoading]);

  return (
    <ComponentContext.Provider value={contextValue}>
      <WebcontainerProvider>
        <Container className="!p-0 lg:overflow-hidden">
          <div className="grid size-full max-h-full grid-cols-1 justify-center lg:grid-cols-3 lg:flex-row xl:grid-cols-4">
            <div className="col-span-1 flex size-full min-h-full flex-col lg:col-span-2 xl:col-span-3 xl:mb-0">
              <div className="relative flex flex-col items-center justify-start border-b py-1.5 pr-2 xl:flex-row xl:justify-between xl:pl-11">
                <h1 className="mb-2 flex min-w-0 max-w-full flex-1 items-center font-medium lg:mb-0">
                  {title ? (
                    <p className="mx-10 min-w-0 max-w-full xl:mx-0">
                      <span className="block truncate text-center first-letter:uppercase">
                        {title}
                      </span>
                    </p>
                  ) : (
                    <span className="flex items-center">
                      <Loader className="mr-2 size-4 animate-spin" />
                      Loading
                    </span>
                  )}
                </h1>
                <div className="ml-2 flex items-center gap-2">
                  <Tabs
                    value={isCanvas ? "canvas" : "code"}
                    className="w-full"
                    onValueChange={(value) => setCanvas(value === "canvas")}
                  >
                    <TabsList className="grid w-fit grid-cols-2 text-xs">
                      <TabsTrigger
                        value="canvas"
                        className="flex items-center justify-center"
                      >
                        <Eye className="size-4 md:hidden" />
                        <span className="hidden md:inline">Preview</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="code"
                        className="flex items-center justify-center"
                      >
                        <CodeIcon className="size-4 md:hidden" />
                        <span className="hidden md:inline">Code</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {(fetchedChat?.framework === Framework.HTML ||
                    (isWebcontainerReady &&
                      fetchedChat?.framework !== Framework.HTML)) && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center"
                            disabled={isLoading || isLengthError}
                          >
                            <Fullscreen className="w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isLengthError ? (
                            <p>The component has an error</p>
                          ) : (
                            <p>Display in fullscreen</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                      {(isWebcontainerReady ||
                        fetchedChat?.framework === Framework.HTML) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  fetchedChat?.framework === Framework.HTML
                                    ? `https://www.coderocket.app/content/${chatId}/${selectedVersion}`
                                    : `https://${chatId}-${selectedVersion}.preview.coderocket.app`,
                                  "_blank",
                                )
                              }
                              className="flex items-center"
                              disabled={isLoading || isLengthError}
                            >
                              <ExternalLink className="w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isLengthError ? (
                              <p>The component has an error</p>
                            ) : (
                              <p>Open in a new tab</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Dialog
                        open={isModalOpen}
                        onOpenChange={handleFullscreenToggle}
                      >
                        <DialogContent className="z-[9999] h-[98%] max-w-[98%] rounded-none p-10">
                          <DialogTitle className="hidden">
                            Fullscreen
                          </DialogTitle>
                          <DialogDescription className="z-50">
                            {fetchedChat?.framework !== Framework.HTML &&
                            isWebcontainerReady ? (
                              <iframe
                                className="size-full rounded-md border-none"
                                src={`https://${chatId}-${selectedVersion}.webcontainer.coderocket.app`}
                                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
                                allow="credentialless"
                                loading="eager"
                              />
                            ) : (
                              <RenderHtmlComponent files={artifactFiles} />
                            )}
                          </DialogDescription>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isLoading}
                      >
                        <MoreHorizontal className="w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={share}
                        disabled={!isVisible || isLoading || isLengthError}
                        className="cursor-pointer"
                      >
                        <Share className="mr-2 size-4" />
                        <span>Share</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsRemixModalOpen(true)}
                        disabled={isRemixing || isLoading}
                        className="cursor-pointer"
                      >
                        <GitFork className="mr-2 size-4" />
                        <span>Remix</span>
                      </DropdownMenuItem>
                      {!isLoading && title && authorized && (
                        <>
                          <DropdownMenuSeparator />
                          <ComponentSettings>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                              }}
                            >
                              <Settings className="mr-2 size-4" />
                              <span>Settings</span>
                            </DropdownMenuItem>
                          </ComponentSettings>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="block lg:hidden"
                      >
                        <Layers className="size-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="h-full p-0">
                      <ComponentSidebar className="flex lg:hidden" />
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
              <div className="relative m-0 flex h-full max-h-full flex-1 flex-col border-b lg:border-b-0">
                {!isLoading && isCanvas && (
                  <div className="absolute bottom-0 right-0 z-[9000] flex w-full items-center justify-end gap-2 p-2">
                    {fetchedChat?.clone_url && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={fetchedChat.clone_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate text-xs text-blue-500 hover:text-blue-600 hover:underline"
                            >
                              <Globe className="size-4" />
                              {fetchedChat.clone_url
                                .replace(/^https?:\/\/(www\.)?/i, "")
                                .replace(/\/$/, "")}
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Component generated from this URL</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {remixOriginalChat && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`/components/${remixOriginalChat.slug}`}
                              className="flex items-center gap-1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <GitFork className="size-4" />
                              {remixOriginalChat.title ||
                                `Component ${remixOriginalChat.slug}`}
                              <ExternalLink className="size-3" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            This component is a remix of this original component
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileTap={{ scale: 0.9, rotate: 15 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Button
                            onClick={handleLikeClick}
                            variant="secondary"
                            size="sm"
                            className={`ml-2 flex items-center gap-1 rounded-full p-2 shadow-md transition-colors ${
                              isLiked
                                ? "bg-primary text-secondary hover:bg-primary"
                                : "bg-pink-500 text-pink-300 hover:bg-pink-400"
                            }`}
                          >
                            <Heart className="size-5" />
                            <span>{isLiked ? "Unlike" : "Like"}</span>
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isLiked
                            ? "Remove from liked components"
                            : "Add to liked components"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
                <CodePreview />
              </div>
            </div>
            <ComponentSidebar className="hidden lg:flex" />
          </div>
          <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
            <DialogContent className="max-w-md sm:max-w-2xl">
              <div className="mb-6 flex flex-col items-center justify-center text-center">
                <Share className="mb-2 size-12 text-primary" />
                <DialogTitle className="text-xl font-semibold">
                  Share Your Component
                </DialogTitle>
                <p className="text-muted-foreground">
                  Let the world see your awesome creation! ✨
                </p>
              </div>
              <DialogDescription>
                <p className="mb-1">Here is your shareable link:</p>
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      copy(shareLink);
                      toast({
                        variant: "default",
                        title: "Link copied",
                        description:
                          "The URL has been successfully copied to your clipboard",
                        duration: 3000,
                      });
                    }}
                    size="sm"
                  >
                    <Copy className="size-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </DialogDescription>
            </DialogContent>
          </Dialog>
          <Dialog open={isRemixModalOpen} onOpenChange={setIsRemixModalOpen}>
            <DialogContent className="max-w-md sm:max-w-2xl">
              <div className="mb-6 flex flex-col items-center justify-center text-center">
                <GitFork className="mb-2 size-12 text-primary" />
                <DialogTitle className="text-xl font-semibold">
                  {hasAlreadyRemixed
                    ? "Already Remixed"
                    : "Remix This Component"}
                </DialogTitle>
                <p className="text-muted-foreground">
                  {hasAlreadyRemixed
                    ? "This component is already remixed"
                    : "Create your own version of this component! 🚀"}
                </p>
              </div>
              <DialogDescription>
                {hasAlreadyRemixed ? (
                  <div className="mb-4">
                    {remixOriginalChat && (
                      <div className="rounded-md bg-secondary p-4">
                        <p className="mb-2 font-medium">Want to try again?</p>
                        <p className="mb-4">
                          You can go back to the original component that was
                          used as the base for this remix and create a new remix
                          from there:
                        </p>
                        <div className="flex flex-col items-start gap-2 rounded-md bg-background p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <GitFork className="size-4 text-primary" />
                            <span>Original component:</span>
                          </div>
                          <a
                            href={`/components/${remixOriginalChat.slug}`}
                            className="flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            {remixOriginalChat.title ||
                              `Component ${remixOriginalChat.slug}`}
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="mb-4">
                      Remixing will create a copy of this component that you can
                      modify and customize. This feature is available for
                      subscribers only.
                    </p>
                    <Alert className="mb-4">
                      <AlertTitle className="mb-2 flex items-center gap-2">
                        <Info className="size-4" />{" "}
                        <p>Remixing from selected version</p>
                      </AlertTitle>
                      <AlertDescription>
                        You selected{" "}
                        <Badge variant="outline">
                          version #{selectedVersion}
                        </Badge>{" "}
                        as the base of your remix. You can change this by
                        selecting a different version in the sidebar.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
                <div className="flex justify-center">
                  {hasAlreadyRemixed ? (
                    <Button
                      onClick={() => setIsRemixModalOpen(false)}
                      className="flex w-full max-w-xs items-center justify-center"
                    >
                      <X className="size-4" />
                      <span>Close</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        handleRemixClick();
                      }}
                      disabled={isRemixing}
                      className="flex w-full max-w-xs items-center justify-center"
                    >
                      {isRemixing ? (
                        <>
                          <Loader className="size-4 animate-spin" />
                          Creating Remix...
                        </>
                      ) : (
                        <>
                          <GitFork className="size-4" />
                          Remix Component
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </DialogDescription>
            </DialogContent>
          </Dialog>
        </Container>
      </WebcontainerProvider>
    </ComponentContext.Provider>
  );
}
