"use client";

import {
  Sandpack,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { aquaBlue } from "@codesandbox/sandpack-themes";
import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import { useCompletion } from "ai/react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { useSupabase } from "@/app/supabase-provider";
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
import { capitalizeFirstLetter } from "@/utils/helpers";

import { fetchChat } from "../actions";
import { ChatMessage } from "../types";

const externalResources = [
  "https://unpkg.com/tailwindcss-cdn@3.4.3/tailwindcss-with-all-plugins.js",
  "https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css",
];

export default function Chats({ params }: { params: { id: string } }) {
  const { supabase } = useSupabase();
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
    onError: async () => {
      router.push("/pricing?paymentRequired=true");
      return;
    },
    onFinish: async () => {
      const fetchedChat = await fetchChat(params.id);
      setMessages(fetchedChat?.messages || []);
      setInput("");
    },
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userIdFromSession = data.session?.user.id;
      setAuthorized(userIdFromSession === userId);
    });
  }, [userId]);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      const userIdFromSession = session?.user.id;
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
        console.log(e);
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
    const selectedIndex = assistantMessagesOnly.findIndex(
      (m) => m.id === selectedVersion,
    );

    const lastAssistantMessageIndex = assistantMessagesOnly.length - 1;

    if (selectedIndex === 0) {
      return assistantMessagesOnly.filter((_, index) => {
        return index <= 2;
      });
    }

    if (selectedIndex === lastAssistantMessageIndex) {
      return assistantMessagesOnly.filter((_, index) => {
        return index >= lastAssistantMessageIndex - 2;
      });
    }

    return assistantMessagesOnly.filter((_, index) => {
      return (
        index === selectedIndex ||
        index === selectedIndex - 1 ||
        index === selectedIndex + 1
      );
    });
  }, [messages, selectedVersion]);

  const copyRawHTML = () => {
    copy(completion);
    toast({
      variant: "default",
      title: "Successfully copied",
      description:
        "Your component has been successfully saved to your clipboard",
    });
  };

  const MemoizedSandpack = useMemo(() => {
    return (
      <Sandpack
        theme={aquaBlue}
        options={{
          recompileMode: "delayed",
          recompileDelay: 800,
          externalResources,
          editorHeight: 600,
          showReadOnly: false,
          showConsoleButton: false,
          showConsole: false,
          readOnly: true,
        }}
        template="static"
        files={{
          "/index.html": completion,
        }}
      />
    );
  }, [completion]);

  return (
    <>
      <Container className="pt-24">
        <div className="mb-3 w-full md:w-5/6">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-700">
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
                      <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Loading
                    </span>
                  ) : (
                    capitalizeFirstLetter(title)
                  )}
                </h1>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger onClick={copyRawHTML} asChild>
                  <Button variant="outline">
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
        <div className="flex w-full flex-col items-stretch justify-center space-x-0 md:flex-row md:space-x-3">
          <div className="mb-3 w-full space-y-3 md:mb-0 md:w-5/6">
            {MemoizedSandpack}
            {authorized && (
              <form className="flex justify-start" onSubmit={handleSubmit}>
                <div className="flex w-full space-x-4 rounded-md bg-gray-900 p-2 sm:w-1/2">
                  <Input
                    autoFocus
                    disabled={isLoading}
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Add a button, modify a color..."
                  />
                  <Button loading={isLoading} type="submit">
                    Iterate
                  </Button>
                </div>
              </form>
            )}
          </div>
          <div className="h-full w-full space-y-3 md:w-1/6">
            {assistantMessages.map((m) => (
              <SandpackProvider
                key={m.id}
                theme="light"
                options={{
                  externalResources,
                }}
                template="static"
                files={{
                  "/index.html": m?.content ?? "",
                }}
              >
                <div
                  className={clsx(
                    "rounded-md border bg-transparent",
                    selectedVersion === m.id &&
                      "border border-indigo-600 shadow-2xl shadow-indigo-500/20 transition-colors",
                  )}
                >
                  <SandpackLayout>
                    <SandpackPreview className="!h-44" />
                    <div
                      className="absolute inset-0 z-10 flex cursor-pointer  select-none items-center justify-center bg-black/25 hover:bg-black/20  "
                      onClick={() => handleVersionSelect(m.id)}
                    >
                      <Badge
                        className="absolute bottom-0 right-0 m-4"
                        variant="secondary"
                      >
                        v{m.version}
                      </Badge>
                      {selectedVersion === m.id && (
                        <Badge
                          className="absolute bottom-0 left-0 m-4 text-indigo-500"
                          variant="default"
                        >
                          Selected
                        </Badge>
                      )}
                    </div>
                  </SandpackLayout>
                </div>
              </SandpackProvider>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
