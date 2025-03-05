"use client";

import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import { useCompletion } from "ai/react";
import { Crisp } from "crisp-sdk-web";
import { addDays, format } from "date-fns";
import { motion } from "framer-motion";
import {
  Fullscreen,
  Layers,
  LoaderCircle,
  Settings,
  ExternalLink,
  ThumbsUp,
  Copy,
  GitFork,
} from "lucide-react";
import { Share } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
import RenderHtmlComponent from "@/components/renders/render-html-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  TRIAL_PLAN_MESSAGES_PER_DAY,
  crispWebsiteId,
  getMaxMessagesPerPeriod,
} from "@/utils/config";
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

  const [fetchedChat, setFetchedChat] = useState<Tables<"chats"> | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] =
    useState<Tables<"messages"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isLiked, setIsLiked] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const [image, setImage] = useState<File | null>(null);
  const [defaultImage, setDefaultImage] = useState<string | null>(null);

  const [remixOriginalChat, setRemixOriginalChat] =
    useState<Tables<"chats"> | null>(null);

  const [isRemixing, setIsRemixing] = useState(false);
  const [subscription, setSubscription] =
    useState<Tables<"subscriptions"> | null>(null);

  const [isRemixModalOpen, setIsRemixModalOpen] = useState(false);

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
        setIsLoading(true);
        return;
      }
      if (
        chat?.framework !== Framework.HTML &&
        chat.artifact_code &&
        assistantMsg?.content
      ) {
        const newArtifactFiles = extractFilesFromArtifact(chat.artifact_code);
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
      fetch: async (url) => {
        const formData = new FormData();
        if (image) {
          formData.append("image", image);
        }
        formData.append("id", chatId);
        formData.append("selectedVersion", String(selectedVersion));
        formData.append("prompt", input);
        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(async () => {
            const text = await response.text();
            return { error: text };
          });
          throw new Error(errorData.error || "An unknown error occurred");
        }

        return response;
      },
      streamProtocol: "text",
      initialCompletion: lastAssistantMessage?.content,
      experimental_throttle: 500,
      onError: async (error: Error) => {
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
        if (error.message === "limit-exceeded") {
          const subscription = await getSubscription();
          if (!subscription) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const maxMessagesPerPeriod = TRIAL_PLAN_MESSAGES_PER_DAY;
            const resetDate = addDays(today, 1);
            setIsLoading(false);
            setCanvas(true);
            toast({
              variant: "destructive",
              title: "Daily message limit reached",
              description: `You have reached your limit of ${maxMessagesPerPeriod} messages for today. This limit will reset tomorrow (${format(
                resetDate,
                "d MMMM yyyy",
              )}). Upgrade to a paid plan to continue.`,
              duration: 4000,
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
            description: `You have reached your limit of ${maxMessagesPerPeriod} messages for ${subscription.prices?.interval}. This limit will reset on ${resetDate}. Go to My Account to see your usage.`,
            duration: 4000,
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
              variant: "destructive",
              title: "AI reached token limit",
              description: `The AI reached its token limit. You can continue by clicking the "Continue your work" button.`,
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
        }

        setCanvas(true);
        setInput("");
        setImage(null);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setIsLoading(false);
      },
    });

  const handleSubmitToAI = (input: string) => {
    setForceBuild(true);
    setCompletion("");
    setArtifactFiles([]);
    setWebcontainerReady(false);
    setChatFiles([]);
    setCanvas(false);
    setIsLoading(true);
    complete(input);
  };

  const handleVersionSelect = (version: number, tabName?: string) => {
    setSelectedVersion(version);
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

    if (
      selectedAssistantMessage.content.includes(
        "<!-- FINISH_REASON: length -->",
      ) ||
      selectedAssistantMessage.content.includes("<!-- FINISH_REASON: error -->")
    ) {
      setIsLengthError(true);
    } else {
      setIsLengthError(false);
    }

    setCompletion(selectedAssistantMessage.content);
    handleChatFiles(selectedAssistantMessage.content, false, tabName);
    setWebcontainerReady(selectedAssistantMessage.is_built || false);
  };

  const share = () => {
    const link =
      fetchedChat?.framework === Framework.HTML
        ? `https://www.tailwindai.dev/content/${chatId}/${selectedVersion}`
        : `https://${chatId}-${selectedVersion}.preview.tailwindai.dev`;
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
    setArtifactCode(refreshedChat.artifact_code || "");
    const title = refreshedChat.title || `Version #${selectedVersion}`;
    setTitle(title);
    document.title = `${title} - Tailwind AI`;
    return refreshedChatMessages;
  };

  const handleChatFiles = (
    _completion: string,
    isFirstRun?: boolean,
    tabName?: string,
  ) => {
    const newArtifactCode = getUpdatedArtifactCode(_completion, artifactCode);
    const newArtifactFiles = extractFilesFromArtifact(newArtifactCode);
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
    } else {
      Crisp.chat.show();
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
    console.log("subscription", subscription);
    if (!subscription) {
      toast({
        variant: "destructive",
        title: "Subscription required",
        description:
          "Only subscribers can remix projects. Please upgrade to create remixes.",
        duration: 4000,
      });
      return;
    }

    try {
      setIsRemixing(true);
      const newChat = await remixChat(chatId);

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
    } finally {
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
    image,
    setImage,
    defaultImage,
    loadingState,
    setLoadingState,
    isLengthError,
  };

  const FrameworkIcon =
    fetchedChat?.framework === Framework.HTML
      ? SiHtml5
      : fetchedChat?.framework === Framework.REACT
        ? SiReact
        : SiVuedotjs;

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
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <ComponentContext.Provider value={contextValue}>
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
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
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
                    <TabsTrigger value="canvas">Preview</TabsTrigger>
                    <TabsTrigger value="code">Code</TabsTrigger>
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
                                  ? `https://www.tailwindai.dev/content/${chatId}/${selectedVersion}`
                                  : `https://${chatId}-${selectedVersion}.preview.tailwindai.dev`,
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
                        <DialogTitle className="hidden">Fullscreen</DialogTitle>
                        <DialogDescription className="z-50">
                          {fetchedChat?.framework !== Framework.HTML &&
                          isWebcontainerReady ? (
                            <iframe
                              className="size-full rounded-md border-none"
                              src={`https://${chatId}-${selectedVersion}.webcontainer.tailwindai.dev`}
                              sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
                              allow="credentialless"
                              loading="eager"
                            />
                          ) : (
                            <RenderHtmlComponent files={chatFiles} />
                          )}
                        </DialogDescription>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={share}
                        disabled={!isVisible}
                        className={isVisible ? "" : "cursor-not-allowed"}
                      >
                        <Share className="w-5" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isVisible
                        ? "Share Component"
                        : "Your component needs to be public to share it. You can make it public by clicking the settings button."}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setIsRemixModalOpen(true)}
                        disabled={isRemixing}
                        className="flex items-center gap-2"
                      >
                        <GitFork className="w-5" />
                        <Badge className="hover:bg-primary">New</Badge>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remix this component</p>
                  </TooltipContent>
                </Tooltip>
                {!isLoading && title && authorized && (
                  <ComponentSettings>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={isLoading}
                    >
                      <Settings className="w-5" />
                    </Button>
                  </ComponentSettings>
                )}
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
                <div className="absolute bottom-0 right-0 z-[9999] flex w-full items-center justify-between p-2">
                  {remixOriginalChat ? (
                    <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm shadow-sm">
                      <GitFork className="size-4" />
                      <span>Remixed from:</span>
                      <a
                        href={`/components/${remixOriginalChat.slug}`}
                        className="flex items-center gap-1 font-medium text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {remixOriginalChat.title ||
                          `Component ${remixOriginalChat.slug}`}
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  ) : (
                    <div className="invisible"></div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge className="hover:bg-primary">
                      <FrameworkIcon className="mr-1 size-3" />
                      <span className="first-letter:uppercase">
                        {fetchedChat?.framework}
                      </span>
                    </Badge>
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
                            className={`ml-2 rounded-full p-2 shadow-md transition-colors ${
                              isLiked
                                ? "bg-primary text-secondary hover:bg-primary"
                                : "bg-green-300 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            <ThumbsUp className="size-5" />
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isLiked ? "Unlike" : "Like"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}
              <WebcontainerProvider>
                <CodePreview />
              </WebcontainerProvider>
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
                Remix This Component
              </DialogTitle>
              <p className="text-muted-foreground">
                Create your own version of this component! 🚀
              </p>
            </div>
            <DialogDescription>
              <p className="mb-4">
                Remixing will create a copy of this component that you can
                modify and customize. This feature is available for subscribers
                only.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    handleRemixClick();
                    setIsRemixModalOpen(false);
                  }}
                  disabled={isRemixing}
                  className="w-full max-w-xs"
                >
                  {isRemixing ? (
                    <>
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                      Creating Remix...
                    </>
                  ) : (
                    <>
                      <GitFork className="mr-2 size-4" />
                      Remix Component
                    </>
                  )}
                </Button>
              </div>
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </Container>
    </ComponentContext.Provider>
  );
}
