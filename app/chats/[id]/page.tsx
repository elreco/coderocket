"use client";

import {
  Sandpack,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { githubLight } from "@codesandbox/sandpack-themes";
import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { Message } from "ai";
import { useCompletion } from "ai/react";
import clsx from "clsx";
import { Parser } from "html-to-react";
import beautify from "js-beautify";
import { useEffect, useMemo, useState } from "react";

import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { capitalizeFirstLetter } from "@/utils/helpers";

const beautifyOptions: beautify.HTMLBeautifyOptions = {
  indent_inner_html: true,
  indent_body_inner_html: true,
  wrap_attributes: "preserve",
  indent_size: 4,
};

const fetchMessages = async (id: string): Promise<Message[]> => {
  const response = await fetch(`/api/chats/${id}`);
  if (!response.ok) {
    console.log("Failed:", response.status, response.statusText);
    return [];
  }
  const data = await response.json();
  const messages = data[0].messages as Message[];

  let assistantVersion = -1;
  return messages.map((m, index) => {
    if (m.role === "assistant") {
      return {
        ...m,
        id: `message-${index}`,
        version: ++assistantVersion,
      };
    } else {
      return {
        ...m,
        id: `message-${index}`,
      };
    }
  });
};

export default function Generations({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [loadingMessages, setLoadingMessages] = useState(true);
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
    api: `/api/completions`,
    body: { id: params.id },
    onFinish: () => {
      setLoadingMessages(true);
      fetchMessages(params.id).then((fetchedMessages) => {
        setMessages(fetchedMessages);
        setLoadingMessages(false);
      });
      setInput("");
    },
  });

  useEffect(() => {
    fetchMessages(params.id).then((fetchedMessages) => {
      setMessages(fetchedMessages);
      setLoadingMessages(false);
    });
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
      setCompletion(lastCompletionMessage.content);
      handleVersionSelect(lastCompletionMessage.id);
    }
  }, [messages.length]);

  const beautifiedContent = useMemo(() => {
    return beautify.html(completion, beautifyOptions);
  }, [completion]);

  const handleVersionSelect = (id: string) => {
    const selectedMessageIndex = messages.findIndex((m) => m.id === id);
    if (selectedMessageIndex > -1) {
      setSelectedVersion(id);
      setTitle(messages[selectedMessageIndex - 1].content);
      setCompletion(messages[selectedMessageIndex].content);
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
        return index >= 0 && index <= 3;
      });
    }

    if (selectedIndex === lastAssistantMessageIndex) {
      return assistantMessagesOnly.filter((_, index) => {
        return (
          index >= lastAssistantMessageIndex - 3 &&
          index <= lastAssistantMessageIndex
        );
      });
    }

    if (selectedIndex === 1) {
      return assistantMessagesOnly.filter((_, index) => {
        return index >= selectedIndex - 1 && index <= selectedIndex + 2;
      });
    }

    return assistantMessagesOnly.filter((_, index) => {
      return (
        index === selectedIndex ||
        index === selectedIndex - 1 ||
        index === selectedIndex - 2 ||
        index === selectedIndex + 1
      );
    });
  }, [messages, selectedVersion]);

  return (
    <>
      <Container className="pt-24">
        <div className="md:w-5/6 w-full mb-3">
          <div className="font-semibold text-gray-700">
            {loadingMessages ? (
              <span className="flex items-center">
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" /> Loading
              </span>
            ) : (
              capitalizeFirstLetter(title)
            )}
          </div>
        </div>
        <div className="flex w-full flex-col items-stretch justify-center space-x-0 md:flex-row md:space-x-3">
          <div className="mb-3 w-full space-y-3 md:mb-0 md:w-5/6">
            <Sandpack
              theme={githubLight}
              options={{
                initMode: "immediate",
                recompileMode: "immediate",
                externalResources: [
                  "https://unpkg.com/@tailwindcss/ui/dist/tailwind-ui.min.css",
                  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css",
                ],
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
            <form className="flex space-x-4" onSubmit={handleSubmit}>
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
            </form>
          </div>
          <div className="h-full w-full md:w-1/6">
            {assistantMessages.map((m) => (
              <div className="mb-4" key={m.id}>
                <SandpackProvider
                  theme={githubLight}
                  options={{
                    externalResources: [
                      "https://unpkg.com/@tailwindcss/ui/dist/tailwind-ui.min.css",
                      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css",
                    ],
                  }}
                  template="static"
                  files={{
                    "/index.html": beautify.html(m?.content || ""),
                  }}
                >
                  <SandpackLayout>
                    <SandpackPreview className="!h-44" />
                    <div
                      className={clsx(
                        "absolute inset-0 z-10 flex cursor-pointer select-none items-center justify-center  ",
                        selectedVersion === m.id
                          ? "bg-black/25 hover:bg-black/20"
                          : "bg-black/25 hover:bg-black/20",
                      )}
                      onClick={() => handleVersionSelect(m.id)}
                    >
                      <Badge
                        className="absolute bottom-0 right-0 m-4"
                        variant="default"
                      >
                        v{m.version}
                      </Badge>
                      {selectedVersion === m.id && (
                        <Badge
                          className="absolute bottom-0 left-0 m-4"
                          variant="secondary"
                        >
                          Selected
                        </Badge>
                      )}
                    </div>
                  </SandpackLayout>
                </SandpackProvider>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
