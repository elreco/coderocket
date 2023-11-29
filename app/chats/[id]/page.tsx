"use client";

import {
  Sandpack,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { githubLight } from "@codesandbox/sandpack-themes";
import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import { useCompletion } from "ai/react";
import clsx from "clsx";
import beautify from "js-beautify";
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

const beautifyOptions: beautify.HTMLBeautifyOptions = {
  indent_size: 4,
  indent_char: " ",
  inline: [],
};

const externalResources = [
  "https://unpkg.com/tailwindcss-cdn@3.3.4/tailwindcss-with-all-plugins.js",
];

export default function Chats({ params }: { params: { id: string } }) {
  const { supabase } = useSupabase();
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [loadingMessages, setLoadingMessages] = useState(true);
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
      setLoadingMessages(false);
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
    setLoadingMessages(true);
    const getData = async () => {
      try {
        const fetchedChat = await fetchChat(params.id);
        setMessages(fetchedChat?.messages || []);
        setLoadingMessages(false);
        setUserId(fetchedChat?.user_id?.id || "");
        setUserFullName(fetchedChat?.user_id?.full_name || "");
        setUserAvatar(fetchedChat?.user_id?.avatar_url || "");
        console.log(fetchedChat?.user_id?.full_name || "");
        console.log(fetchedChat?.user_id?.full_name);
      } catch (e) {
        console.log(e);
      }
    };
    getData();
  }, [params.id]);

  useEffect(() => {
    if (messages.length === 2) {
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

  const beautifiedContent = useMemo(() => {
    const content = beautify.html(completion, beautifyOptions);
    return content;
  }, [completion]);

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
    copy(beautifiedContent);
    toast({
      variant: "default",
      title: "Successfully copied",
      description:
        "Your component has been successfully saved to your clipboard",
    });
  };

  return (
    <>
      <Container className="pt-24">
        <div className="md:w-5/6 w-full mb-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-700">
              {loadingMessages ||
                (!title && (
                  <span className="flex items-center">
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />{" "}
                    Loading
                  </span>
                ))}
              {!loadingMessages && (
                <div className="flex items-center space-x-2">
                  {userAvatar && (
                    <Avatar>
                      <AvatarImage src={userAvatar} />
                    </Avatar>
                  )}
                  {userFullName && (
                    <Badge variant="default">{userFullName}</Badge>
                  )}
                  <h1>{capitalizeFirstLetter(title)}</h1>
                </div>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger onClick={copyRawHTML}>
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
            <Sandpack
              theme={githubLight}
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
                "/index.html": beautifiedContent,
              }}
            />
            {authorized && (
              <form className="flex justify-center" onSubmit={handleSubmit}>
                <div className="w-full sm:w-1/2 flex space-x-4">
                  <Input
                    autoFocus
                    disabled={isLoading}
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Make it modern UI"
                  />
                  <Button loading={isLoading} type="submit">
                    Generate
                  </Button>
                </div>
              </form>
            )}
          </div>
          <div className="h-full w-full md:w-1/6 space-y-3">
            {assistantMessages.map((m) => (
              <SandpackProvider
                key={m.id}
                theme={githubLight}
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
                    "bg-transparent border rounded-md",
                    selectedVersion === m.id &&
                      "border-indigo-600 border transition-colors shadow-2xl shadow-indigo-500/20",
                  )}
                >
                  <SandpackLayout>
                    <SandpackPreview className="!h-44" />
                    <div
                      className="absolute inset-0 z-10 bg-black/25 hover:bg-black/20  flex cursor-pointer select-none items-center justify-center  "
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
