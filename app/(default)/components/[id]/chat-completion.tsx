"use client";

import { useCompletion } from "ai/react";
import { LoaderCircle } from "lucide-react";
import { Code, Share, Tv, Lock, Unlock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { Container } from "@/components/container";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import { Tables } from "@/types_db";
import { maxPromptLength } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { capitalizeFirstLetter } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/client";

import { fetchMessagesByChatId } from "../actions";

import { changeVisibilityByChatId, deleteVersionByMessageId } from "./actions";
import ChatSidebar from "./chat-sidebar";
import ChatSidebarMobile from "./chat-sidebar-mobile";
import CodePreview from "./code-preview";

interface Props {
  fetchedChat: Tables<"chats"> & { user: Tables<"users"> | null };
  authorized: boolean;
  fetchedMessages: Tables<"messages">[];
  userAvatar: string;
  userFullName: string;
  lastAssistantMessage: Tables<"messages"> | null;
  lastUserMessage: Tables<"messages">;
}

export default function ChatCompletion({
  fetchedChat,
  fetchedMessages,
  authorized,
  userAvatar,
  userFullName,
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
  const [isCanvas, setCanvas] = useState(false);
  const [isVisible, setVisible] = useState(!fetchedChat.is_private);
  const [input, setInput] = useState<string>("");

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

  const { completion, isLoading, stop, complete } = useCompletion({
    api: "/api/component",
    headers: {
      "X-Custom-Header": JSON.stringify({
        id: fetchedChat.id,
        selectedVersion,
      }),
    },
    streamProtocol: "text",
    initialCompletion: lastAssistantMessage?.content,
    onError: async (error: Error) => {
      if (error.message === "payment-required") {
        return router.push("/pricing?paymentRequired=true");
      }
      if (error.message) {
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: error.message,
          duration: 5000,
        });
      }
      return;
    },
    onFinish: () => refreshChatData(),
  });

  const [activeCompletion, setActiveCompletion] = useState(completion);

  useEffect(() => {
    if (completion) {
      setActiveCompletion(completion);
    }
  }, [completion]);

  useEffect(() => {
    if (
      !lastAssistantMessage?.content &&
      !isLoading &&
      messages.length === 1 &&
      lastUserMessage.content
    ) {
      complete(lastUserMessage.content);
    }
  }, []);

  const handleSubmitToAI = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCanvas(false);
    complete(input);
  };

  const handleVersionSelect = (version: number) => {
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
    if (selectedAssistantMessage?.content) {
      setActiveCompletion(selectedAssistantMessage.content);
    }
  };

  const assistantMessages = useMemo(() => {
    return messages.filter((m) => m.role === "assistant").reverse();
  }, [messages]);

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

  const handleVisibility = async () => {
    try {
      await changeVisibilityByChatId(fetchedChat.id, !isVisible);
      setVisible(!isVisible);
    } catch {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not premium, the visibility cannot be changed. Please upgrade to premium and try again.",
        duration: 5000,
      });
    }
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
      setInput("");
    }
  }, [messages]);

  return (
    <Container>
      <div className="flex size-full flex-col justify-center space-x-0 xl:max-h-full xl:flex-row xl:space-x-3">
        <div className="flex h-full flex-col space-y-2 xl:w-11/12">
          <div className="flex flex-col items-center justify-start space-y-2 lg:flex-row lg:justify-between lg:space-y-0">
            <div className="font-medium">
              <div className="flex items-center space-x-2">
                {!isLoading && title && authorized && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleVisibility}
                        variant="secondary"
                        className="flex items-center"
                      >
                        {isVisible ? (
                          <>
                            <Unlock className="mr-1 w-5" />
                            <span>Public</span>
                          </>
                        ) : (
                          <>
                            <Lock className="mr-1 w-5" />
                            <span>Private</span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent side="right">
                      <p>{isVisible ? "Set private" : "Set public"}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
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
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    onClick={() => setCanvas(!isCanvas)}
                    className="mr-1 flex items-center"
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
              <ChatSidebarMobile
                authorized={authorized}
                handleDeleteVersion={handleDeleteVersion}
                isLoading={isLoading}
                assistantMessages={assistantMessages}
                selectedVersion={selectedVersion}
                messages={messages}
                handleVersionSelect={handleVersionSelect}
              />
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
            </div>
          </div>
          <div className="m-0 flex h-full flex-1 flex-col">
            <CodePreview
              completion={activeCompletion}
              isCanvas={isCanvas}
              isLoading={isLoading}
            />
            <div className="flex w-full flex-col items-center justify-between sm:flex-row">
              <form
                className="flex w-full items-center"
                onSubmit={handleSubmitToAI}
              >
                {authorized && (
                  <div className="my-2 flex w-full space-x-4 rounded-md bg-gray-900 p-2">
                    <Input
                      autoFocus
                      disabled={isLoading}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      minLength={2}
                      maxLength={maxPromptLength}
                      placeholder="Add a button, modify a color..."
                      required
                    />
                    <Button loading={isLoading} type="submit">
                      Iterate
                    </Button>
                  </div>
                )}
              </form>
              <div className="flex w-full items-center justify-end pt-1">
                <p className="text-sm text-muted-foreground">
                  {getRelativeDate(lastUserMessage.created_at)} by
                </p>
                <div className="ml-2 flex items-center space-x-2">
                  <Avatar>
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback>{getInitials(userFullName)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium">{userFullName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ChatSidebar
          authorized={authorized}
          assistantMessages={assistantMessages}
          selectedVersion={selectedVersion}
          messages={messages}
          handleVersionSelect={handleVersionSelect}
          handleDeleteVersion={handleDeleteVersion}
          isLoading={isLoading}
        />
      </div>
    </Container>
  );
}
