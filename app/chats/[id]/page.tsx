"use client";

import {
  Sandpack,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { githubLight } from "@codesandbox/sandpack-themes";
import { Message } from "ai";
import { useCompletion } from "ai/react";
import clsx from "clsx";
import beautify from "js-beautify";
import { useEffect, useMemo, useState } from "react";

import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  return data[0].messages;
};

export default function Generations({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
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
      fetchMessages(params.id).then((fetchedMessages) =>
        setMessages(fetchedMessages),
      );
      setInput("");
    },
  });

  useEffect(() => {
    fetchMessages(params.id).then((fetchedMessages) =>
      setMessages(fetchedMessages),
    );
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
    }
  }, [messages.length]);

  const beautifiedContent = useMemo(() => {
    return beautify.html(completion, beautifyOptions);
  }, [completion]);

  const handleVersionSelect = (index: number) => {
    setSelectedVersion(index);
    setCompletion(assistantMessages.find((m, i) => index === i)?.content || "");
  };

  const assistantMessages = useMemo(
    () => messages.filter((m) => m.role === "assistant"),
    [messages],
  );

  return (
    <>
      <Container className="flex w-full flex-col items-stretch justify-center space-x-0 pt-24 md:flex-row md:space-x-3">
        <div className="mb-3 max-h-[600px] w-full space-y-3 md:mb-0 md:w-3/4">
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
              autoFocus={true}
              disabled={isLoading}
              value={input}
              onChange={handleInputChange}
            />
            <Button disabled={isLoading} type="submit">
              Send
            </Button>
          </form>
        </div>
        <div className="h-full w-full md:w-1/6">
          {assistantMessages.map((m, index) => (
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
                  "/index.html": beautify.html(m.content),
                }}
              >
                <SandpackLayout>
                  <SandpackPreview className="!h-44" />
                  <div
                    className={clsx(
                      "absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/25 hover:bg-black/20",
                      selectedVersion === index && "bar",
                    )}
                    onClick={() => handleVersionSelect(index)}
                  >
                    <Badge
                      className="absolute bottom-0 right-0 m-4"
                      variant="default"
                    >
                      v{index}
                    </Badge>
                  </div>
                </SandpackLayout>
              </SandpackProvider>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
