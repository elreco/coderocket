import { Paintbrush } from "lucide-react";
import { useEffect, useState, useRef } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, getInitials } from "@/lib/utils";
import { Tables } from "@/types_db";
import { maxPromptLength } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

import ComponentSettings from "./(settings)/component-settings";
import ComponentFiles from "./component-files";
import { ComponentSidebarSkeleton } from "./component-sidebar-skeleton";

interface Props {
  user: Tables<"users"> | null;
  selectedVersion: number;
  completion: string;
  messages: (Tables<"messages"> & {
    chats: {
      user: Tables<"users">;
      prompt_image: string | null;
    };
  })[];
  activeTab: string;
  handleVersionSelect: (version: number) => void;
  handleDeleteVersion: (messageId: number) => void;
  handleSubmitToAI: (
    e: React.FormEvent<HTMLFormElement>,
    input: string,
  ) => void;
  authorized: boolean;
  isLoading: boolean;
  setInput: (input: string) => void;
  isCanvas: boolean;
  input: string;
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
  selectedTheme: string | null | undefined;
  setSelectedTheme: (theme: string) => void;
  handleComponentFiles: (
    _completion: string,
    theme: string | null | undefined,
    isFirstRun?: boolean,
    tabName?: string,
  ) => void;
  refreshChatData: () => Promise<void>;
  chatId: string;
}

export default function ComponentSidebar({
  selectedVersion,
  messages,
  user,
  activeTab,
  handleVersionSelect,
  handleDeleteVersion,
  handleSubmitToAI,
  authorized,
  isLoading,
  setInput,
  input,
  isCanvas,
  isVisible,
  setVisible,
  selectedTheme,
  setSelectedTheme,
  completion,
  handleComponentFiles,
  refreshChatData,
  chatId,
}: Props) {
  const [isLoaderVisible, setLoaderVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaderVisible(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current && messages.length > 0) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmitToAI(e, input);
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [isLoading, messages]);

  const isIterationVisible = selectedVersion !== null && selectedVersion > -1;

  return (
    <div
      className="relative size-full overflow-hidden rounded-md border bg-secondary"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="relative size-full">
        <div
          ref={containerRef}
          className="flex size-full flex-col overflow-y-auto pb-16"
        >
          {isLoaderVisible && (
            <div className="absolute inset-0 z-10 flex size-full flex-col items-start bg-secondary p-4">
              <ComponentSidebarSkeleton />
            </div>
          )}
          {messages.map((m) => (
            <ComponentFiles
              authorized={authorized}
              activeTab={activeTab}
              isDeletable={messages.length > 2}
              selectedVersion={selectedVersion}
              message={m}
              key={m.id}
              isLoading={isLoading}
              handleVersionSelect={handleVersionSelect}
              handleDeleteVersion={handleDeleteVersion}
              isCanvas={isCanvas}
            />
          ))}
          <div
            className={cn(
              "flex flex-col px-2 py-6 sm:px-4",
              "transition-all duration-200",
              isLoading && messages.length > 1 ? "block" : "hidden",
            )}
          >
            <div className="flex gap-2">
              <div className="flex items-center">
                <Avatar className="mr-2 size-8 rounded-lg">
                  <AvatarImage
                    src={user?.avatar_url || ""}
                    alt={user?.full_name || ""}
                  />
                  <AvatarFallback className="border bg-background">
                    <span className="text-xs">
                      {getInitials(user?.full_name || "")}
                    </span>
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-sm">{input}</p>
            </div>
            <p className="mt-2 text-right text-xs font-semibold text-primary">
              {getRelativeDate(new Date().toISOString())}
            </p>
          </div>

          <div
            className={cn(
              "flex flex-col px-2 py-6 sm:px-4",
              "transition-all duration-200",
              isLoading ? "block" : "hidden",
            )}
          >
            <div className="flex items-start gap-2">
              <Avatar className="mr-2 size-8 rounded-none">
                <AvatarImage src="/logo-white.png" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar>
              <p className="animate-pulse text-sm">Generating...</p>
            </div>
          </div>

          <form
            className="absolute inset-x-0 bottom-0 flex w-full items-center"
            onSubmit={(e) => handleSubmit(e)}
          >
            {authorized && (
              <div className="flex w-full flex-col space-y-2 rounded-b-md border-t bg-background p-2">
                <div className="flex w-full items-center justify-between">
                  {isIterationVisible && (
                    <div className="whitespace-nowrap text-sm font-semibold">
                      Iterate from selected{" "}
                      <span className="text-primary">
                        version #{selectedVersion}
                      </span>
                    </div>
                  )}
                  {authorized && !isLoading && (
                    <div className="text-sm font-semibold">
                      <ComponentSettings
                        isVisible={isVisible}
                        setVisible={setVisible}
                        selectedTheme={selectedTheme}
                        setSelectedTheme={setSelectedTheme}
                        selectedVersion={selectedVersion}
                        chatId={chatId}
                        completion={completion}
                        handleComponentFiles={handleComponentFiles}
                        refreshChatData={refreshChatData}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex items-center"
                        >
                          <Paintbrush className="size-4" />
                          <span className="ml-0.5">Theme</span>
                        </Button>
                      </ComponentSettings>
                    </div>
                  )}
                </div>
                <div className="flex w-full space-x-4">
                  <Input
                    autoFocus
                    disabled={isLoading}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    minLength={2}
                    maxLength={maxPromptLength}
                    placeholder="Add a button, modify a div..."
                    required
                  />
                  <Button loading={isLoading} type="submit">
                    Iterate
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
