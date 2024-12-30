"use client";

import { useCompletion } from "ai/react";
import { Fullscreen, LoaderCircle, Settings } from "lucide-react";
import { Code, Share, Tv } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";
import { handleAIcompletionForHTML } from "@/utils/completion-parser";
import { capitalizeFirstLetter } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/client";

import { fetchMessagesByChatId } from "../actions";

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
  const [input, setInput] = useState<string>("");

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

  const [componentFiles, setComponentFiles] = useState<
    { name: string | null; content: string }[]
  >([]);

  const [activeTab, setActiveTab] = useState("");

  const { completion, isLoading, stop, complete, setCompletion } =
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
      },
    });

  const handleSubmitToAI = (
    e: React.FormEvent<HTMLFormElement>,
    input: string,
  ) => {
    e.preventDefault();
    setCompletion("");
    setCanvas(false);
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
    handleComponentFiles(selectedAssistantMessage.content, false, tabName);
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
    return refreshedChatMessages;
  };

  const handleComponentFiles = (
    _completion: string,
    isFirstRun?: boolean,
    tabName?: string,
  ) => {
    const files = handleAIcompletionForHTML(_completion);

    if (files.length > 0) {
      setComponentFiles(files);
    } else {
      setComponentFiles([]);
    }

    if (tabName) {
      const file = files.find((file) => file.name === tabName);

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
      const firstFile = files[0];
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
    const lastFile = files[files.length - 1];
    if (!lastFile) {
      setEditorValue("");
      setActiveTab("");
      setCanvas(false);
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
      handleComponentFiles(completion);
    }
  }, [completion]);

  useEffect(() => {
    if (lastAssistantMessage?.content) {
      handleComponentFiles(lastAssistantMessage.content, true);
      handleVersionSelect(lastAssistantMessage.version);
    }
    if (
      !lastAssistantMessage?.content &&
      !isLoading &&
      messages.length === 1 &&
      lastUserMessage.content
    ) {
      setCanvas(false);
      complete(lastUserMessage.content);
    }
  }, []);

  const contextValue = {
    isCanvas,
    setCanvas,
    isLoading,
    selectedVersion,
    componentFiles,
    activeTab,
    editorValue,
    handleVersionSelect,
    authorized,
    completion,
    messages,
    user,
    handleComponentFiles,
    refreshChatData,
    isVisible,
    setVisible,
    input,
    setInput,
    handleSubmitToAI,
    setCompletion,
    chatId: fetchedChat.id,
  };

  return (
    <ComponentContext.Provider value={contextValue}>
      <Container className="overflow-hidden sm:!p-0">
        <div className="grid grid-cols-1 justify-center gap-y-4 lg:size-full lg:max-h-full lg:grid-cols-3 lg:flex-row lg:gap-y-0 lg:pb-0 xl:grid-cols-4">
          <div className="col-span-1 flex size-full min-h-screen flex-col lg:col-span-2 xl:col-span-3 xl:mb-0 xl:min-h-full">
            <div className="flex flex-col items-center justify-start space-y-2 border-b pr-2 sm:py-1.5 xl:flex-row xl:justify-between xl:space-y-0">
              <h1 className="flex items-center space-x-2 pl-11 font-medium">
                {isLoading || !title ? (
                  <span className="flex items-center">
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    Loading
                  </span>
                ) : (
                  <Tooltip>
                    <TooltipTrigger className="text-left">
                      <span onClick={() => copyPrompt(title)}>
                        {capitalizeFirstLetter(title)}
                      </span>
                    </TooltipTrigger>

                    <TooltipContent>
                      <p>Copy Prompt</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </h1>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCanvas(!isCanvas)}
                    >
                      {isCanvas ? (
                        <div className="flex items-center">
                          <Code className="mr-1 size-4" />
                          <span>Code</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Tv className="mr-1 size-4" />
                          <span>Canvas</span>
                        </div>
                      )}
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent>
                    <p>{isCanvas ? "Display code" : "Hide code"}</p>
                  </TooltipContent>
                </Tooltip>
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
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogContent className="h-[95%] max-w-[95%] rounded-none p-10">
                    <DialogTitle className="hidden">Fullscreen</DialogTitle>
                    <DialogDescription>
                      <RenderHtmlComponent files={componentFiles} />
                    </DialogDescription>
                  </DialogContent>
                </Dialog>
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
              </div>
            </div>
            <div className="m-0 flex h-full flex-1 flex-col">
              <CodePreview />
            </div>
          </div>
          <ComponentSidebar />
        </div>
      </Container>
    </ComponentContext.Provider>
  );
}
