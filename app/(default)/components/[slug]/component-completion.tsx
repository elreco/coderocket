"use client";

import { useCompletion } from "ai/react";
import { Crisp } from "crisp-sdk-web";
import { Fullscreen, Layers, LoaderCircle, Settings } from "lucide-react";
import { Share } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import RenderHtmlComponent from "@/app/(content)/render-html-component";
import { Container } from "@/components/container";
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
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";
import {
  ChatFile,
  extractFilesFromArtifact,
  extractFilesFromCompletion,
  getUpdatedArtifactCode,
} from "@/utils/completion-parser";
import { crispWebsiteId } from "@/utils/config";
import { createClient } from "@/utils/supabase/client";

import { fetchChatById, fetchMessagesByChatId } from "../actions";

import ComponentSettings from "./(settings)/component-settings";
import CodePreview from "./code-preview";
import { ComponentContext } from "./component-context";
import ComponentSidebar from "./component-sidebar";

interface Props {
  fetchedChat: Tables<"chats"> & { user: Tables<"users"> | null };
  authorized: boolean;
  fetchedMessages: (Tables<"messages"> & {
    chats: { user: Tables<"users">; prompt_image: string | null };
  })[];
  user: Tables<"users"> | null;
  lastAssistantMessage: Tables<"messages"> | null;
  lastUserMessage: Tables<"messages">;
}

export default function ComponentCompletion({
  fetchedChat,
  fetchedMessages,
  authorized,
  user,
  lastAssistantMessage,
  lastUserMessage,
}: Props) {
  const supabase = createClient();
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const [messages, setMessages] = useState(fetchedMessages);

  const [selectedVersion, setSelectedVersion] = useState(
    lastUserMessage.version,
  );
  const [title, setTitle] = useState<string>(
    lastUserMessage.content?.toString() || "",
  );
  const [isCanvas, setCanvas] = useState(true);
  const [isVisible, setVisible] = useState(!fetchedChat.is_private);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editorValue, setEditorValue] = useState("");

  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const [artifactFiles, setArtifactFiles] = useState<ChatFile[]>([]);

  const [artifactCode, setArtifactCode] = useState(
    fetchedChat.artifact_code || "",
  );

  const [activeTab, setActiveTab] = useState("");
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const { completion, stop, complete, setCompletion, input, setInput } =
    useCompletion({
      api: "/api/components",
      headers: {
        "X-Custom-Header": JSON.stringify({
          id: fetchedChat.id,
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
            description: "Please upgrade to continue.",
            duration: 5000,
          });
          return;
        }
        if (error.message) {
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
        setIsLoading(false);
      },
    });

  const handleSubmitToAI = (input: string) => {
    setCompletion("");
    setArtifactFiles([]);
    setIframeSrc(null);
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
    const selectedUserMessage = selectedMessages.find((m) => m.role === "user");
    if (selectedUserMessage) {
      setTitle(selectedUserMessage.content?.toString() ?? "");
    }

    const selectedAssistantMessage = selectedMessages.find(
      (m) => m.role === "assistant",
    );
    if (!selectedAssistantMessage?.content) {
      return;
    }
    setCompletion(selectedAssistantMessage.content);
    handleChatFiles(selectedAssistantMessage.content, false, tabName);
  };

  const copyPrompt = (prompt: string) => {
    copy(prompt);
    toast({
      variant: "default",
      title: "Successfully copied",
      description: "The prompt has been successfully saved to your clipboard",
      duration: 5000,
    });
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
    const refreshedChatMessages = await fetchMessagesByChatId(fetchedChat.id);
    if (!refreshedChatMessages) return;
    setMessages(refreshedChatMessages);
    const refreshedChat = await fetchChatById(fetchedChat.id);
    if (!refreshedChat) return;
    setArtifactCode(refreshedChat.artifact_code || "");
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
      setEditorValue("");
      setActiveTab("");
      return;
    }
    const lastFile = newArtifactFiles[newArtifactFiles.length - 1];

    if (!lastFile) {
      setEditorValue("");
      setActiveTab("");
      return;
    }
    setEditorValue(lastFile.content);
    setActiveTab(lastFile.name || "");
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
    if (lastAssistantMessage?.content) {
      handleChatFiles(lastAssistantMessage.content, true);
      //handleVersionSelect(lastAssistantMessage.version);
    }
    if (fetchedChat.framework === "react" && !artifactCode) {
      setCanvas(false);
      complete(lastUserMessage.content);
      setIsLoading(true);
    }
    if (
      !lastAssistantMessage?.content &&
      !isLoading &&
      messages.length === 1 &&
      lastUserMessage.content &&
      fetchedChat.framework === "html"
    ) {
      setCanvas(false);
      complete(lastUserMessage.content);
      setIsLoading(true);
    }
  }, []);

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
    iframeSrc,
    setIframeSrc,
    chatId: fetchedChat.id,
    artifactFiles,
    selectedFramework: fetchedChat.framework || "react",
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
          filter: `chat_id=eq.${fetchedChat.id}`,
        },
        async (payload) => {
          if (payload.old?.screenshot !== payload.new.screenshot) {
            setMessages((prevMessages) =>
              prevMessages.map((message) => {
                if (message.id === payload.new.id) {
                  return {
                    ...message,
                    screenshot: payload.new.screenshot,
                  };
                }
                return message;
              }),
            );
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchedChat.id]);

  return (
    <ComponentContext.Provider value={contextValue}>
      <Container className="!p-0 lg:overflow-hidden">
        <div className="grid size-full max-h-full grid-cols-1 justify-center lg:grid-cols-3 lg:flex-row xl:grid-cols-4">
          <div className="col-span-1 flex size-full min-h-full flex-col lg:col-span-2 xl:col-span-3 xl:mb-0">
            <div className="flex flex-col items-center justify-start border-b py-1.5 pr-2 xl:flex-row xl:justify-between xl:pl-11">
              <h1 className="mb-2 flex min-w-0 max-w-full flex-1 items-center font-medium lg:mb-0">
                {isLoading || !title ? (
                  <span className="flex items-center">
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    Loading
                  </span>
                ) : (
                  <Tooltip>
                    <TooltipTrigger className="mx-10 min-w-0 max-w-full xl:mx-0">
                      <span
                        className="block truncate text-center first-letter:uppercase"
                        onClick={() => copyPrompt(title)}
                      >
                        {title}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy Prompt</p>
                    </TooltipContent>
                  </Tooltip>
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
                {chatFiles.length > 0 &&
                  (fetchedChat.framework === "html" ||
                    (iframeSrc && fetchedChat.framework === "react")) && (
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
                      <Dialog
                        open={isModalOpen}
                        onOpenChange={handleFullscreenToggle}
                      >
                        <DialogContent className="z-[9999] h-[98%] max-w-[98%] rounded-none p-10">
                          <DialogTitle className="hidden">
                            Fullscreen
                          </DialogTitle>
                          <DialogDescription className="z-[9999]">
                            {fetchedChat.framework === "react" && iframeSrc ? (
                              <iframe
                                src={iframeSrc}
                                className="size-full rounded-md border-none"
                              />
                            ) : (
                              <RenderHtmlComponent files={chatFiles} />
                            )}
                          </DialogDescription>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                {isVisible && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="secondary" onClick={share}>
                        <Share className="w-5" />
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent>
                      <p>Share Component</p>
                    </TooltipContent>
                  </Tooltip>
                )}
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
            <div className="m-0 flex h-full max-h-full flex-1 flex-col border-b lg:border-b-0">
              <CodePreview />
            </div>
          </div>
          <ComponentSidebar className="hidden lg:flex" />
        </div>
      </Container>
    </ComponentContext.Provider>
  );
}
