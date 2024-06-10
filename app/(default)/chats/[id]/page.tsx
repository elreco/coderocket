"use client";

import { Sandpack } from "@codesandbox/sandpack-react";
import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { ClipboardIcon } from "@heroicons/react/24/outline";
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

export default function Chats({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [authorized, setAuthorized] = useState(false);
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
        router.push("/pricing?paymentRequired=true");
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
    supabase.auth.getUser().then(({ data }) => {
      const userIdFromSession = data.user?.id;
      setAuthorized(userIdFromSession === userId);
    });
  }, [userId, supabase.auth]);

  supabase.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      const { data } = await supabase.auth.getUser();
      const userIdFromSession = data.user?.id;
      setAuthorized(userIdFromSession === userId);
    }
  });

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

  const getUserMessage = (assistantMessageId: string) => {
    const assistantIndex = messages.findIndex(
      (m) => m.id === assistantMessageId,
    );
    if (assistantIndex > 0) {
      for (let i = assistantIndex - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          return messages[i].content;
        }
      }
    }
    return "No user message found.";
  };

  const MemoizedSandpack = useMemo(() => {
    return (
      <Sandpack
        options={{
          recompileMode: "delayed",
          recompileDelay: 800,
          editorHeight: 675,
          showReadOnly: true,
          showConsoleButton: false,
          showConsole: false,
          readOnly: false,
        }}
        template="static"
        files={{
          "/index.html": completion
            ? `<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css" rel="stylesheet" />
  <link href="tailwindai.css" rel="stylesheet">
</head>
${completion}
</html>`
            : "",
          "/tailwindai.css": {
            code: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
body {
  font-family: 'Inter', sans-serif!important;
}`,
            hidden: true,
          },
        }}
      />
    );
  }, [completion]);

  return (
    <Container>
      <div className="flex w-full flex-col items-stretch justify-center space-x-0 lg:flex-row lg:space-x-3">
        <div className="mb-3 w-full space-y-3 md:mb-0 lg:w-11/12">
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
                  {isLoading ? (
                    <span className="flex items-center">
                      <ArrowPathIcon className="mr-2 size-4 animate-spin" />{" "}
                      Loading
                    </span>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button variant="outline" onClick={copyRawHTML}>
                    <ClipboardIcon className="w-5" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Copy raw HTML</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="rounded-lg bg-white transition-all duration-200">
            {MemoizedSandpack}
          </div>

          {authorized && (
            <form
              className="flex justify-center lg:justify-start"
              onSubmit={handleSubmit}
            >
              <div className="mb-3 flex w-full  space-x-4 rounded-md bg-gray-900 p-2 sm:w-1/2">
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
        <div className="size-full space-y-3 lg:w-1/12">
          {assistantMessages.map((m) => (
            <div key={m.id} className="relative w-full">
              <img
                alt=""
                src={m?.screenshot || ""}
                className={clsx(
                  "aspect-video w-full rounded-md border object-cover",
                  selectedVersion === m.id
                    ? "border-gray-900"
                    : "border-gray-200",
                )}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    className={clsx(
                      "absolute inset-0 z-10 flex cursor-pointer select-none items-center justify-center rounded-md transition-all duration-300",
                      selectedVersion === m.id
                        ? "bg-transparent"
                        : "bg-black/25 hover:bg-transparent",
                    )}
                    onClick={() => handleVersionSelect(m.id)}
                  >
                    <Badge
                      className="absolute bottom-0 right-0 m-2"
                      variant="secondary"
                    >
                      v{m.version}
                    </Badge>
                  </TooltipTrigger>

                  <TooltipContent side="left" className="w-64">
                    <img
                      alt=""
                      src={m?.screenshot || ""}
                      className="my-1.5 w-full rounded object-cover"
                    />
                    <p className="py-2">{getUserMessage(m.id)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
