"use client";

import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { ArrowPathIcon } from "@heroicons/react/20/solid";
import {
  ClipboardIcon,
  CodeBracketIcon,
  TvIcon,
} from "@heroicons/react/24/outline";
import { useCompletion } from "ai/react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { Container } from "@/components/container";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { maxPromptLength } from "@/utils/config";
import { capitalizeFirstLetter } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/client";

import { fetchChat } from "../actions";
import { ChatMessage } from "../types";

import ChatSidebar from "./ChatSidebar";
import ChatSidebarMobile from "./ChatSidebarMobile";

export default function Chats({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [authorized, setAuthorized] = useState(false);
  const [isCanvas, setCanvas] = useState(false);
  const [userId, setUserId] = useState("");
  const [userFullName, setUserFullName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");

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
    body: { id: params.id },
    onError: async (error) => {
      if (error.message === "payment-required") {
        return router.push("/pricing?paymentRequired=true");
      }
      if (error.message) {
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: error.message,
        });
      }
      return;
    },
    onFinish: async () => {
      const fetchedChat = await fetchChat(params.id);
      setMessages(fetchedChat?.messages || []);
      setInput("");
    },
  });

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const userIdFromSession = data.user?.id;
      setAuthorized(userIdFromSession === userId);
    };
    getUser();
  }, [userId, supabase.auth]);

  useEffect(() => {
    const getData = async () => {
      try {
        const fetchedChat = await fetchChat(params.id);
        setMessages(fetchedChat?.messages || []);
        setUserId(fetchedChat?.user_id?.id || "");
        setUserFullName(fetchedChat?.user_id?.full_name || "");
        setUserAvatar(fetchedChat?.user_id?.avatar_url || "");
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: "Can't retrieve chat data, try to refresh.",
        });
      }
    };
    getData();
  }, [params.id]);

  useEffect(() => {
    if (messages.length === 1) {
      const defaultMessage =
        messages?.find((m) => m.role === "user")?.content || "";
      setInput(defaultMessage);
      complete(defaultMessage);
    }
    const lastCompletionMessage = messages
      .slice()
      .reverse()
      .find((message) => message.role === "assistant");
    if (lastCompletionMessage) {
      setCompletion(lastCompletionMessage.content ?? "");
      handleVersionSelect(lastCompletionMessage.id);
    }
  }, [messages.length]);

  const handleVersionSelect = (id: string) => {
    const selectedMessageIndex = messages.findIndex((m) => m.id === id);
    if (selectedMessageIndex > -1) {
      setSelectedVersion(id);
      setTitle(messages[selectedMessageIndex - 1].content ?? "");
      setCompletion(messages[selectedMessageIndex].content ?? "");
    }
  };

  const assistantMessages = useMemo(() => {
    const assistantMessagesOnly = messages.filter(
      (m) => m.role === "assistant",
    );
    return assistantMessagesOnly.slice(-30);
  }, [messages]);

  const copyRawHTML = () => {
    copy(completion);
    toast({
      variant: "default",
      title: "Successfully copied",
      description:
        "Your component has been successfully saved to your clipboard",
    });
  };

  const copyPrompt = (prompt: string) => {
    copy(prompt);
    toast({
      variant: "default",
      title: "Successfully copied",
      description: "The prompt has been successfully saved to your clipboard",
    });
  };

  return (
    <Container>
      <div className="flex size-full flex-col justify-center space-x-0 xl:max-h-full xl:flex-row xl:space-x-3">
        <div className="flex h-full flex-col space-y-2 xl:w-11/12">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-700">
              <div className="flex items-center space-x-2">
                {userAvatar && (
                  <Avatar>
                    <AvatarImage src={userAvatar} />
                  </Avatar>
                )}
                {userFullName && (
                  <Badge variant="default">{userFullName}</Badge>
                )}
                <h1>
                  {isLoading || !title ? (
                    <span className="flex items-center">
                      <ArrowPathIcon className="mr-2 size-4 animate-spin" />{" "}
                      Loading
                    </span>
                  ) : (
                    <TooltipProvider>
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
                    </TooltipProvider>
                  )}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button onClick={() => setCanvas(!isCanvas)}>
                {isCanvas ? (
                  <>
                    <CodeBracketIcon className="mr-1 w-5" /> Code
                  </>
                ) : (
                  <>
                    <TvIcon className="mr-1 w-5" /> Canvas
                  </>
                )}
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <ChatSidebarMobile
                      isLoading={isLoading}
                      assistantMessages={assistantMessages}
                      selectedVersion={selectedVersion}
                      messages={messages}
                      handleVersionSelect={handleVersionSelect}
                    />
                  </TooltipTrigger>

                  <TooltipContent>
                    <p>Versions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      disabled={isLoading}
                      variant="outline"
                      onClick={copyRawHTML}
                    >
                      <ClipboardIcon className="w-5" />
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent>
                    <p>Copy raw HTML</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex flex-1 flex-col space-y-2 rounded-lg bg-white pb-3 transition-all duration-200">
            {completion ? (
              <SandpackProvider
                style={{ height: "100%" }}
                options={{
                  recompileMode: "delayed",
                  recompileDelay: 800,
                }}
                template="static"
                files={{
                  "/index.html": `<html class="size-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css" rel="stylesheet" />
  <link href="tailwindai.css" rel="stylesheet">
</head>
${completion}
</html>`,
                  "/tailwindai.css": {
                    code: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
body {
  font-family: 'Inter', sans-serif!important;
}`,
                    hidden: true,
                  },
                }}
              >
                <div className="flex size-full flex-col gap-3 xl:flex-row">
                  <div
                    className={clsx(
                      "size-full transition-all",
                      isCanvas ? "xl:block xl:w-1/2" : "xl:block  xl:w-full",
                      isCanvas ? "hidden" : "block",
                    )}
                  >
                    <SandpackLayout
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        width: "100%",
                      }}
                    >
                      <SandpackCodeEditor
                        showRunButton={false}
                        readOnly
                        showReadOnly={false}
                      />
                    </SandpackLayout>
                  </div>
                  <div
                    className={clsx(
                      "h-full transition-all xl:w-1/2",
                      isCanvas ? "xl:block" : "xl:hidden",
                      isCanvas ? "block" : "hidden",
                    )}
                  >
                    <SandpackLayout
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        width: "100%",
                      }}
                    >
                      <SandpackPreview />
                    </SandpackLayout>
                  </div>
                </div>
              </SandpackProvider>
            ) : (
              <div className="flex size-full flex-col space-y-3 rounded-lg border bg-white">
                <Skeleton className="m-5 h-1/2 rounded-lg" />
                <div className="m-5 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-[27%]" />
                  <Skeleton className="h-4 w-[34%]" />
                </div>
              </div>
            )}
            {authorized && (
              <form
                className="flex w-full flex-1 items-center xl:justify-start"
                onSubmit={handleSubmit}
              >
                <div className="mr-2 flex w-full space-x-4 rounded-md bg-gray-900 p-2 xl:w-1/2">
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
              </form>
            )}
          </div>
        </div>
        <ChatSidebar
          assistantMessages={assistantMessages}
          selectedVersion={selectedVersion}
          messages={messages}
          handleVersionSelect={handleVersionSelect}
        />
      </div>
    </Container>
  );
}
