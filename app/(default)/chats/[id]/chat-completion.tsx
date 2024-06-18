"use client";

import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { ArrowPathIcon } from "@heroicons/react/20/solid";
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardIcon,
  CodeBracketIcon,
  ShareIcon,
  TvIcon,
} from "@heroicons/react/24/outline";
import { LockClosedIcon, LockOpenIcon } from "@heroicons/react/24/solid";
import { User } from "@supabase/supabase-js";
import { useCompletion } from "ai/react";
import clsx from "clsx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { usePathname, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
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

import { changeVisiblity } from "./actions";
import ChatSidebar from "./chat-sidebar";
import ChatSidebarMobile from "./chat-sidebar-mobile";

const cssContent = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
body {
  font-family: 'Inter', sans-serif!important;
}
`;

export default function ChatCompletion({
  fetchedChat,
  user,
}: {
  fetchedChat: ChatProps;
  user: User | null;
}) {
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>(
    fetchedChat?.messages || [],
  );
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const authorized = user?.id === fetchedChat?.user_id?.id;
  const [isCanvas, setCanvas] = useState(true);
  const userFullName = fetchedChat?.user_id?.full_name || "";
  const userAvatar = fetchedChat?.user_id?.avatar_url || "";
  const [isVisible, setVisible] = useState(!fetchedChat?.is_private);
  const isNotFound =
    fetchedChat?.is_private && fetchedChat?.user_id?.id !== user?.id;

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
    body: { id: fetchedChat.id },
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
      const refreshedChatData = await fetchChat(fetchedChat.id);
      setMessages(refreshedChatData?.messages || []);
      setInput("");
    },
  });

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

  const downloadCode = () => {
    const htmlContent = `
      <html class="size-full">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css" rel="stylesheet" />
          <link href="tailwindai.css" rel="stylesheet">
        </head>
        ${completion}
      </html>
    `;

    const zip = new JSZip();
    zip.file("index.html", htmlContent);
    zip.file("tailwindai.css", cssContent);

    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, "tailwindai-dev.zip");
    });
  };

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

  const share = () => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    copy(`${protocol}//${host}${pathname}`);
    toast({
      variant: "default",
      title: "Successfully copied",
      description: "The url has been successfully saved to your clipboard",
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
          "You are not premium, the visiblity can not be changed. Please upgrade to premium and try again.",
      });
    }
  };

  if (isNotFound) {
    return notFound();
  }

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
                  <Badge variant="default">{userFullName}</Badge>
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
            <SandpackProvider
              style={{ height: "100%" }}
              options={{
                autoReload: true,
                recompileMode: "immediate",
                visibleFiles: ["/index.html", "/tailwind.css"],
                activeFile: "/completion.html",
              }}
              template="static"
              customSetup={{
                entry: "/index.html",
              }}
              files={{
                "/completion.html": {
                  code: completion,
                },
                "/index.html": {
                  code: `<html class="size-full">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css" rel="stylesheet" />
<link href="tailwindai.css" rel="stylesheet">
</head>
${completion}
</html>`,
                },
                "/tailwindai.css": {
                  code: cssContent,
                },
              }}
            >
              <div className="flex size-full flex-col gap-3 xl:flex-row">
                <div
                  className={clsx(
                    "size-full transition-all xl:block",
                    !isCanvas ? "xl:w-1/2" : "xl:w-full",
                    !isCanvas ? "hidden" : "block",
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
                    <SandpackPreview
                      showOpenInCodeSandbox={false}
                      showRefreshButton={false}
                    />
                  </SandpackLayout>
                </div>
                <div
                  className={clsx(
                    "group h-full transition-all xl:block",
                    isCanvas ? "xl:invisible xl:w-0" : "xl:visible xl:w-1/2",
                    !isCanvas ? "block" : "hidden",
                  )}
                >
                  <SandpackLayout
                    style={{
                      flex: 1,
                      display: "flex",
                      position: "relative",
                      flexDirection: "column",
                      height: "100%",
                      width: "100%",
                    }}
                  >
                    <SandpackCodeEditor
                      showRunButton={false}
                      showReadOnly={false}
                      showTabs={false}
                      readOnly
                    />
                    <div className="absolute right-0 top-0 m-2 flex flex-col items-center justify-center space-y-2 xl:hidden group-hover:xl:flex">
                      <Button
                        disabled={isLoading}
                        variant="outline"
                        onClick={copyRawHTML}
                        className=" items-center p-1 transition-all duration-300"
                      >
                        <span className="mr-1 text-nowrap text-xs">
                          Copy code
                        </span>{" "}
                        <ClipboardIcon className="w-4" />
                      </Button>

                      <Button
                        disabled={isLoading}
                        variant="outline"
                        onClick={downloadCode}
                        className="  items-center p-1 transition-all duration-300"
                      >
                        <span className="mr-1 text-nowrap text-xs">
                          Download
                        </span>{" "}
                        <ArrowDownTrayIcon className="w-4" />
                      </Button>
                    </div>
                  </SandpackLayout>
                </div>
              </div>
            </SandpackProvider>

            {authorized && (
              <form
                className="flex w-full flex-1 items-center xl:justify-start"
                onSubmit={handleSubmit}
              >
                <div className="mr-0 flex w-full space-x-4 rounded-md bg-gray-900 p-2 xl:mr-2 xl:w-1/2">
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
