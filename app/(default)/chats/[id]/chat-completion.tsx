"use client";

import { ArrowPathIcon } from "@heroicons/react/20/solid";
import {
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon,
  ShareIcon,
  TvIcon,
} from "@heroicons/react/24/outline";
import { LockClosedIcon, LockOpenIcon } from "@heroicons/react/24/solid";
import { useCompletion } from "ai/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { Container } from "@/components/container";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { openInCodeSandbox } from "@/utils/codesandbox";
import { maxPromptLength } from "@/utils/config";
import { capitalizeFirstLetter } from "@/utils/helpers";

import { fetchChat } from "../actions";
import { ChatMessage, ChatProps } from "../types";

import { changeVisiblity, deleteVersion } from "./actions";
import ChatSidebar from "./chat-sidebar";
import ChatSidebarMobile from "./chat-sidebar-mobile";
import MemoizedSandpack from "./memoized-sandpack";

export default function ChatCompletion({
  fetchedChat,
  authorized,
  userAvatar,
  userFullName,
  defaultCompletion,
  defaultVisibility,
  defaultTitle,
  defaultSelectedVersion,
  defaultMessages,
  defaultMessage,
}: {
  fetchedChat: ChatProps;
  authorized: boolean;
  userAvatar: string;
  userFullName: string;
  defaultCompletion: string;
  defaultVisibility: boolean;
  defaultTitle: string;
  defaultSelectedVersion: number;
  defaultMessages: ChatMessage[];
  defaultMessage: string;
}) {
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [selectedVersion, setSelectedVersion] = useState<number>(
    defaultSelectedVersion,
  );
  const [title, setTitle] = useState<string>(defaultTitle);
  const [isCanvas, setCanvas] = useState(false);
  const [isVisible, setVisible] = useState(defaultVisibility);

  const {
    completion,
    isLoading,
    input,
    handleInputChange,
    handleSubmit,
    setCompletion,
    complete,
    setInput,
  } = useCompletion({
    api: "/api/completion",
    body: { id: fetchedChat.id, selectedVersion },
    initialInput: defaultMessage,
    initialCompletion: defaultCompletion,
    onError: async (error) => {
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
    onFinish: async () => {
      await refreshChatData();
    },
  });
  useEffect(() => {
    if (defaultMessages.length === 1) {
      complete(defaultMessage);
    }
  }, []);

  const handleVersionSelect = (
    id: number,
    updatedMessages: ChatMessage[] = messages,
  ) => {
    const selectedMessageIndex = updatedMessages.findIndex((m) => m.id === id);
    if (selectedMessageIndex > -1) {
      setSelectedVersion(id);
      setTitle(updatedMessages[selectedMessageIndex - 1]?.content ?? "");
      setCompletion(updatedMessages[selectedMessageIndex]?.content ?? "");
    }
  };

  const assistantMessages = useMemo(() => {
    return messages.filter((m) => m.role === "assistant");
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
      await changeVisiblity(!isVisible, fetchedChat.id);
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

  const handleDeleteVersion = async (chatId: string, id: number) => {
    try {
      await deleteVersion(chatId, id);
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
    const refreshedChatData = await fetchChat(fetchedChat.id);
    setMessages(refreshedChatData?.messages || []);
    setInput("");
    const lastCompletionMessage = refreshedChatData?.messages
      .slice()
      .reverse()
      .find((message) => message.role === "assistant");
    if (lastCompletionMessage) {
      setCompletion(lastCompletionMessage.content ?? "");
      handleVersionSelect(
        lastCompletionMessage.id,
        refreshedChatData?.messages || [],
      );
    }
  };

  return (
    <Container>
      <div className="flex size-full flex-col justify-center space-x-0 xl:max-h-full xl:flex-row xl:space-x-3">
        <div className="flex h-full flex-col space-y-2 xl:w-11/12">
          <div className="flex flex-col items-center justify-start space-y-2 lg:flex-row lg:justify-between lg:space-y-0">
            <div className="font-medium text-gray-700">
              <div className="flex items-center space-x-2">
                {!isLoading && title && authorized && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        onClick={handleVisibility}
                        className="flex items-center"
                      >
                        {isVisible ? (
                          <>
                            <LockOpenIcon className="mr-1 w-5" />
                            <span>Public</span>
                          </>
                        ) : (
                          <>
                            <LockClosedIcon className="mr-1 w-5" />{" "}
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
                {userAvatar && (
                  <Avatar>
                    <AvatarImage src={userAvatar} />
                  </Avatar>
                )}
                {userFullName && (
                  <Badge variant="default" className="text-nowrap">
                    {userFullName}
                  </Badge>
                )}
                <h1>
                  {isLoading || !title ? (
                    <span className="flex items-center">
                      <ArrowPathIcon className="mr-2 size-4 animate-spin" />{" "}
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
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    onClick={() => setCanvas(!isCanvas)}
                    className="mr-1 flex items-center"
                  >
                    {isCanvas ? (
                      <>
                        <CodeBracketIcon className="mr-1 w-5" />{" "}
                        <span>Code</span>
                      </>
                    ) : (
                      <>
                        <TvIcon className="mr-1 w-5" /> <span>Canvas</span>
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
                fetchedChat={fetchedChat}
                handleDeleteVersion={handleDeleteVersion}
                isLoading={isLoading}
                assistantMessages={assistantMessages}
                selectedVersion={selectedVersion}
                messages={messages}
                handleVersionSelect={handleVersionSelect}
              />

              <Tooltip>
                <TooltipTrigger>
                  <Button
                    disabled={isLoading}
                    variant="outline"
                    onClick={() => openInCodeSandbox(completion)}
                    className="mr-1"
                  >
                    <ArrowTopRightOnSquareIcon className="w-5" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Open Sandbox</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <Button variant="outline" onClick={share}>
                    <ShareIcon className="w-5" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Share Component</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="flex flex-1 flex-col space-y-2 rounded-lg pb-2 transition-all duration-200">
            <MemoizedSandpack
              completion={completion}
              isCanvas={isCanvas}
              isLoading={isLoading}
            />
            {authorized && (
              <form
                className="flex w-full flex-row items-center xl:justify-between xl:gap-3"
                onSubmit={handleSubmit}
              >
                <div className="flex w-full space-x-4 rounded-md bg-gray-900 p-2 xl:w-1/2">
                  <Input
                    autoFocus
                    disabled={isLoading}
                    value={input}
                    onChange={handleInputChange}
                    minLength={2}
                    maxLength={maxPromptLength}
                    placeholder="Add a button, modify a color..."
                  />
                  <Button loading={isLoading} type="submit">
                    Iterate
                  </Button>
                </div>
                <div className="hidden w-1/2 xl:block"></div>
              </form>
            )}
          </div>
        </div>
        <ChatSidebar
          authorized={authorized}
          assistantMessages={assistantMessages}
          selectedVersion={selectedVersion}
          messages={messages}
          fetchedChat={fetchedChat}
          handleVersionSelect={handleVersionSelect}
          handleDeleteVersion={handleDeleteVersion}
        />
      </div>
    </Container>
  );
}
