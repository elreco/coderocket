"use client";

import { useCompletion } from "ai/react";
import { Fullscreen, LoaderCircle } from "lucide-react";
import { Code, Share, Tv } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";
import { defaultTheme } from "@/utils/config";
import { capitalizeFirstLetter, getURL } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/client";

import { fetchMessagesByChatId } from "../actions";

import ComponentSettings from "./(settings)/component-settings";
import { deleteVersionByMessageId } from "./actions";
import CodePreview from "./code-preview";
import ComponentSidebar from "./component-sidebar";

interface Props {
  fetchedChat: Tables<"chats"> & { user: Tables<"users"> | null };
  authorized: boolean;
  fetchedMessages: (Tables<"messages"> & {
    chats: { user: Tables<"users"> };
  })[];
  user: Tables<"users"> | null;
  lastAssistantMessage: Tables<"messages"> | null;
  lastUserMessage: Tables<"messages">;
}

export default function ChatCompletion({
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
  const [selectedTheme, setSelectedTheme] = useState(
    lastAssistantMessage?.theme || defaultTheme,
  );
  const [title, setTitle] = useState<string>(
    lastUserMessage.content?.toString() || "",
  );
  const [isCanvas, setCanvas] = useState(true);
  const [isVisible, setVisible] = useState(!fetchedChat.is_private);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      onFinish: () => {
        refreshChatData();
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

  const handleVersionSelect = useCallback(
    (version: number) => {
      setSelectedVersion(version);
      const selectedMessages = messages.filter((m) => m.version == version);
      if (selectedMessages.length !== 2) {
        return;
      }
      const selectedUserMessage = selectedMessages.find(
        (m) => m.role === "user",
      );
      if (selectedUserMessage) {
        setTitle(selectedUserMessage.content?.toString() ?? "");
      }

      const selectedAssistantMessage = selectedMessages.find(
        (m) => m.role === "assistant",
      );
      if (selectedAssistantMessage?.content) {
        setCompletion(selectedAssistantMessage.content);
        setSelectedTheme(selectedAssistantMessage?.theme || defaultTheme);
      }
    },
    [messages, setCompletion, setSelectedTheme, setTitle],
  );

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

  const handleDeleteVersion = async (messageId: number) => {
    try {
      await deleteVersionByMessageId(messageId);
      await refreshChatData();
    } catch {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not premium, you can't delete a version. Please upgrade to premium and try again.",
        duration: 5000,
      });
    }
  };

  const refreshChatData = async () => {
    const refreshedChatMessages = await fetchMessagesByChatId(fetchedChat.id);
    if (!refreshedChatMessages) return;
    setMessages(refreshedChatMessages);
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

  useEffect(() => {
    if (messages.length > 0) {
      const lastAssistantMessage = messages
        .filter((m) => m.role === "assistant")
        .reduce(
          (prev, current) => (prev.version > current.version ? prev : current),
          messages[0],
        );

      if (lastAssistantMessage) {
        handleVersionSelect(lastAssistantMessage.version);
      }
    }
  }, [messages, handleVersionSelect]);

  return (
    <Container>
      <div className="grid grid-cols-1 justify-center gap-y-4 space-x-0 pb-4 lg:size-full lg:max-h-full lg:grid-cols-3 lg:flex-row lg:gap-y-0 lg:space-x-3 lg:pb-0 xl:grid-cols-4">
        <div className="col-span-1 flex size-full min-h-screen flex-col space-y-2 lg:col-span-2 xl:col-span-3 xl:mb-0 xl:min-h-full">
          <div className="flex flex-col items-center justify-start space-y-2 xl:flex-row xl:justify-between xl:space-y-0">
            <div className="font-medium">
              <div className="flex items-center space-x-2">
                <h1>
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
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    onClick={() => setCanvas(!isCanvas)}
                    className="flex items-center"
                  >
                    {isCanvas ? (
                      <>
                        <Code className="mr-1 w-5" />
                        <span>Code</span>
                      </>
                    ) : (
                      <>
                        <Tv className="mr-1 w-5" />
                        <span>Canvas</span>
                      </>
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
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center"
                  >
                    <Fullscreen className="w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Display in fullscreen</p>
                </TooltipContent>
              </Tooltip>
              {!isLoading && (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogContent className="h-[95%] max-w-[95%] rounded-none p-10">
                    <DialogTitle className="hidden">Fullscreen</DialogTitle>
                    <iframe
                      className="mx-auto size-full rounded-md border-none"
                      src={`${getURL()}/content/${fetchedChat.id}/${selectedVersion}/${selectedTheme}`}
                      title="Preview"
                    />
                  </DialogContent>
                </Dialog>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" onClick={share}>
                    <Share className="w-5" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Share Component</p>
                </TooltipContent>
              </Tooltip>
              {!isLoading && title && authorized && (
                <ComponentSettings
                  isVisible={isVisible}
                  setVisible={setVisible}
                  selectedTheme={selectedTheme}
                  setSelectedTheme={setSelectedTheme}
                  selectedVersion={selectedVersion}
                  chatId={fetchedChat.id}
                  refreshChatData={refreshChatData}
                />
              )}
            </div>
          </div>
          <div className="m-0 flex h-full flex-1 flex-col">
            <CodePreview
              chatId={fetchedChat.id}
              completion={completion}
              isCanvas={isCanvas}
              isLoading={isLoading}
              selectedTheme={selectedTheme}
              selectedVersion={selectedVersion}
            />
          </div>
        </div>
        <div className="relative h-[500px] overflow-auto lg:size-full lg:overflow-hidden">
          <ComponentSidebar
            authorized={authorized}
            completion={completion}
            handleSubmitToAI={handleSubmitToAI}
            selectedVersion={selectedVersion}
            messages={messages}
            user={user}
            setInput={setInput}
            input={input}
            handleVersionSelect={handleVersionSelect}
            handleDeleteVersion={handleDeleteVersion}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Container>
  );
}
