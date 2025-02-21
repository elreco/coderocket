"use client";

import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import { useCompletion } from "ai/react";
import { Crisp } from "crisp-sdk-web";
import { addDays, format } from "date-fns";
import {
  Fullscreen,
  Layers,
  LoaderCircle,
  Settings,
  ExternalLink,
} from "lucide-react";
import { Share } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatMessage, ComponentContext } from "@/context/component-context";
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
  const pathname = usePathname();
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(
    undefined,
  );
  const [title, setTitle] = useState<string>("");
  const [isCanvas, setCanvas] = useState(true);
  const [isVisible, setVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editorValue, setEditorValue] = useState("");
  const [isWebcontainerReady, setWebcontainerReady] = useState(false);

  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const [artifactFiles, setArtifactFiles] = useState<ChatFile[]>([]);

  const [artifactCode, setArtifactCode] = useState("");

  const [activeTab, setActiveTab] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [forceBuild, setForceBuild] = useState(false);

  const [fetchedChat, setFetchedChat] = useState<Tables<"chats"> | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] =
    useState<Tables<"messages"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      const [chat, assistantMsg, userMsg, msgs] = await Promise.all([
        fetchChatById(chatId),
        fetchLastAssistantMessageByChatId(chatId),
        fetchLastUserMessageByChatId(chatId),
        fetchMessagesByChatId(chatId, false),
      ]);
      if (!chat) {
        return;
      }
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

      if (msgs?.length === 1) {
        setCanvas(false);
        complete(userMsg?.content || "");
        setInput(userMsg?.content || "");
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
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsLoading(false);
    };
    loadInitialData();
  }, [chatId]);

  const { completion, stop, complete, setCompletion, input, setInput } =
    useCompletion({
      api: "/api/components",
      headers: {
        "X-Custom-Header": JSON.stringify({
          id: chatId,
          selectedVersion,
        }),
      },
      streamProtocol: "text",
      initialCompletion: lastAssistantMessage?.content,
      experimental_throttle: 500,
      onError: async (error: Error) => {
        if (error.message === "payment-required") {
          router.push("/pricing");
          toast({
            variant: "destructive",
            title: "You have reached the limit of your free plan",
            description:
              "Please upgrade to continue. Go to My Account to see your usage.",
            duration: 5000,
          });
          return;
        }
        if (error.message === "length") {
          setIsLoading(false);
          setCanvas(true);
          toast({
            variant: "destructive",
            title: "You have reached the limit of our AI",
            description: `Our AI has reached the maximum number of tokens it can generate. Please create a new component.`,
            duration: 5000,
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
              duration: 5000,
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
            duration: 5000,
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
            duration: 5000,
          });
        }
      },
      onFinish: async () => {
        const refreshedChatMessages = await refreshChatData();
        if (refreshedChatMessages) {
          const refreshedLastAssistantMessage = refreshedChatMessages.reduce(
            (prev, current) =>
              prev.version > current.version ? prev : current,
            { version: 0 },
          );
          if (refreshedLastAssistantMessage) {
            handleVersionSelect(refreshedLastAssistantMessage.version);
          }
        }
        setCanvas(true);
        setInput("");
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
    setCompletion(selectedAssistantMessage.content);
    handleChatFiles(selectedAssistantMessage.content, false, tabName);
    setWebcontainerReady(selectedAssistantMessage.is_built || false);
  };

  const share = () => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    copy(`${protocol}//${host}${pathname}`);
    toast({
      variant: "default",
      title: "Successfully copied",
      description: "The URL has been successfully saved to your clipboard",
      duration: 5000,
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

          if (payload.new.is_built) {
            setWebcontainerReady(true);
          }
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
                          disabled={isLoading}
                        >
                          <Fullscreen className="w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Display in fullscreen</p>
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
                            disabled={isLoading}
                          >
                            <ExternalLink className="w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open in a new tab</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Dialog
                      open={isModalOpen}
                      onOpenChange={handleFullscreenToggle}
                    >
                      <DialogContent className="z-50 h-[98%] max-w-[98%] rounded-none p-10">
                        <DialogTitle className="hidden">Fullscreen</DialogTitle>
                        <DialogDescription className="z-50">
                          {fetchedChat?.framework !== Framework.HTML &&
                          isWebcontainerReady ? (
                            <iframe
                              className="size-full border-none"
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
                        className={!isVisible ? "cursor-not-allowed" : ""}
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
              {!isLoading && (
                <Badge className="absolute bottom-0 right-0 z-[49] m-2 hover:bg-primary">
                  <FrameworkIcon className="mr-1 size-3" />
                  <span className="first-letter:uppercase">
                    {fetchedChat?.framework}
                  </span>
                </Badge>
              )}
              <WebcontainerProvider>
                <CodePreview />
              </WebcontainerProvider>
            </div>
          </div>
          <ComponentSidebar className="hidden lg:flex" />
        </div>
      </Container>
    </ComponentContext.Provider>
  );
}
