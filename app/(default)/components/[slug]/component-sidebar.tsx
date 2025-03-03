import {
  BookOpen,
  ChevronsRight,
  CircleFadingArrowUp,
  MessageSquare,
  Paintbrush,
  WandSparkles,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";

import { ImageSelector } from "@/components/image-selector";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { useComponentContext } from "@/context/component-context";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ChatFile,
  ContentChunk,
  extractFilesFromCompletion,
  hasArtifacts,
  splitContentIntoChunks,
} from "@/utils/completion-parser";
import { Framework, maxImageSize, storageUrl } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { getInitials } from "@/utils/helpers";

import ComponentTheme from "./(settings)/component-theme";
import { improvePromptByChatId } from "./actions";
import { ChunkReader } from "./chunk-reader";
import ComponentChatFiles from "./component-chat-files";
import { ComponentSidebarSkeleton } from "./component-sidebar-skeleton";
import { Markdown } from "./markdown";
import { PromptImage } from "./prompt-image";

export default function ComponentSidebar({
  className,
}: {
  className?: string;
}) {
  const {
    chatId,
    authorized,
    messages,
    isLoading,
    selectedVersion,
    user,
    handleSubmitToAI,
    input,
    setInput,
    selectedFramework,
    completion,
    handleVersionSelect,
    image,
    setImage,
    defaultImage,
    loadingState,
  } = useComponentContext();

  const [isLoaderVisible, setLoaderVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [streamingChunks, setStreamingChunks] = useState<ContentChunk[]>([]);
  const [activeTab, setActiveTab] = useState("chat");
  const [hasImproved, setHasImproved] = useState(false);
  const [isImprovingLoading, setIsImprovingLoading] = useState(false);
  const [files, setFiles] = useState<ChatFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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
    }, 500);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      toast({
        variant: "destructive",
        title: "Empty input",
        description: "Please enter a prompt before submitting",
        duration: 2000,
      });
      return;
    }

    handleSubmitToAI(input);
    setActiveTab("chat");
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageRemove = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImprovePrompt = async () => {
    if (isImprovingLoading) return;
    if (!input) {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not premium, the visibility cannot be changed. Please upgrade to premium and try again.",
        duration: 2000,
      });
      return;
    }
    try {
      setIsImprovingLoading(true);
      const improvedPrompt = await improvePromptByChatId(chatId, input);
      setInput(improvedPrompt);
      setHasImproved(true);
      setIsImprovingLoading(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not premium, the visibility cannot be changed. Please upgrade to premium and try again.",
        duration: 2000,
      });
    }
  };

  useEffect(() => {
    if (isLoading && containerRef.current) {
      const scrollToBottom = () => {
        containerRef.current!.scrollTop = containerRef.current!.scrollHeight;
      };

      // Scroll immédiatement
      scrollToBottom();

      // Créer un observateur pour détecter les changements de contenu
      const observer = new MutationObserver(scrollToBottom);

      // Observer les changements dans le conteneur
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, [isLoading]);

  const isIterationVisible =
    selectedVersion !== undefined && selectedVersion > -1;

  useEffect(() => {
    if (isLoading && completion) {
      const newChunks = splitContentIntoChunks(completion);
      setStreamingChunks(newChunks);
      const hasArtifactResult = hasArtifacts(completion);
      if (hasArtifactResult) {
        setFiles(extractFilesFromCompletion(completion));
      } else {
        setFiles([]);
      }
    } else {
      setStreamingChunks([]);
    }
  }, [completion, isLoading]);

  const handleFileClick = (version: number) => {
    if (isLoading) {
      return;
    }
    setActiveTab("chat");
    handleVersionSelect(version, undefined);
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems) return;

      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file && file.size <= maxImageSize) {
            setImage(file);
          } else {
            toast({
              variant: "destructive",
              title: "Image too large",
              description: `The image must be less than ${maxImageSize / (1024 * 1024)} Mo.`,
              duration: 2000,
            });
          }
          break;
        }
      }
    };

    const textarea = inputRef.current;
    if (textarea) {
      textarea.addEventListener("paste", handlePaste);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener("paste", handlePaste);
      }
    };
  }, [inputRef, toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) {
      return;
    }
    const file = e.target.files[0];

    if (file.size > maxImageSize) {
      toast({
        variant: "destructive",
        title: "Image too large",
        description: `The image must be less than ${maxImageSize / (1024 * 1024)} Mo.`,
        duration: 2000,
      });
      return;
    }

    setImage(file);
  };

  return (
    <div
      className={cn(
        "relative flex size-full flex-col overflow-hidden border-l-0 bg-secondary lg:border-l",
        className,
      )}
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (!isLoading) {
            handleTabChange(value);
          }
        }}
        className="w-full rounded-none lg:w-auto"
      >
        <TabsList className="grid w-full grid-cols-2 rounded-none">
          <TabsTrigger value="chat" disabled={isLoading}>
            <MessageSquare className="block size-4 xl:hidden" />
            <span className="hidden xl:block">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="history" disabled={isLoading}>
            <BookOpen className="block size-4 xl:hidden" />
            <span className="hidden xl:block">History</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div
        ref={containerRef}
        className="flex size-full max-h-full flex-col overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        {isLoaderVisible && (
          <div className="absolute inset-0 z-10 flex size-full flex-col items-start bg-secondary p-4">
            <ComponentSidebarSkeleton />
          </div>
        )}
        {activeTab === "chat" &&
          !isLoading &&
          messages
            .filter((m) => m.version === selectedVersion)
            .map((m) => <ComponentChatFiles message={m} key={m.id} />)}
        {!isLoading && activeTab === "history" && (
          <div className="flex flex-col gap-4 p-4">
            {messages
              .filter((m) => m.role === "user")
              .map((m) => (
                <div
                  key={m.id}
                  onClick={() =>
                    m.version !== selectedVersion &&
                    (loadingState === "error" || !loadingState) &&
                    handleFileClick(m.version)
                  }
                  className={cn(
                    "rounded-lg border bg-background p-4 shadow-sm",
                    m.version === selectedVersion
                      ? "cursor-default hover:bg-background"
                      : "cursor-pointer hover:bg-secondary",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex w-full items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarImage
                          src={user?.avatar_url || undefined}
                          alt={user?.full_name || undefined}
                        />
                        <AvatarFallback className="bg-secondary text-xs">
                          {getInitials(user?.full_name || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {user?.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Version #{m.version}
                        </span>
                      </div>
                    </div>
                    {m.version === selectedVersion ? (
                      <Badge variant="outline" className="rounded-full">
                        Current
                      </Badge>
                    ) : (
                      <ChevronsRight className="size-4" />
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm">{m.content}</p>
                  <p className="mt-2 text-right text-xs text-muted-foreground">
                    {getRelativeDate(m.created_at)}
                  </p>
                </div>
              ))}
          </div>
        )}
        <div
          className={cn(
            "flex flex-col px-2 py-6 sm:px-4",
            "transition-all duration-200",
            isLoading && input ? "block" : "hidden",
          )}
        >
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-5">
            <UserAvatar
              avatarUrl={user?.avatar_url}
              fullName={user?.full_name}
            />
            <Markdown>{input}</Markdown>
            <PromptImage
              image={
                image
                  ? URL.createObjectURL(image)
                  : defaultImage
                    ? `${storageUrl}/${defaultImage}`
                    : null
              }
            />
          </div>
          <p className="mt-2 text-right text-xs font-semibold text-muted-foreground">
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
          <div className="flex w-full flex-col gap-2 overflow-x-auto text-sm">
            {input && (
              <div className="flex items-center">
                <Avatar className="mr-2 size-10 rounded-none">
                  <AvatarImage src="/logo-white.png" />
                  <AvatarFallback>T</AvatarFallback>
                </Avatar>
                <h2
                  className={cn(
                    "text-lg ml-2 font-semibold transition-all group-hover:text-primary",
                  )}
                >
                  Generating version...
                </h2>
              </div>
            )}
            <ChunkReader
              chunks={streamingChunks}
              files={files}
              handleFileClick={handleFileClick}
            />
            <div className="mt-2 flex gap-1">
              <span className="size-2 animate-[typing_1s_ease-in-out_infinite] rounded-full bg-foreground/50"></span>
              <span className="size-2 animate-[typing_1s_ease-in-out_infinite] rounded-full bg-foreground/50 delay-300"></span>
              <span className="delay-[600ms] size-2 animate-[typing_1s_ease-in-out_infinite] rounded-full bg-foreground/50"></span>
            </div>
          </div>
        </div>
      </div>
      <form
        className="flex w-full flex-1 items-center"
        onSubmit={(e) => handleSubmit(e)}
      >
        {authorized && (
          <div className="flex w-full flex-col bg-background">
            <div className="flex w-full items-center justify-between border-t p-2">
              <div className="whitespace-nowrap text-xs font-semibold">
                {!isIterationVisible
                  ? "Generating first version"
                  : isLoading
                    ? "Iterating from "
                    : "Iterate from "}
                {isIterationVisible && (
                  <span className="text-primary">
                    version #{selectedVersion}
                  </span>
                )}
              </div>

              {authorized && selectedFramework === Framework.HTML && (
                <div className="text-sm font-semibold">
                  <ComponentTheme>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex items-center"
                      disabled={isLoading}
                    >
                      <Paintbrush className="size-4" />
                      <span className="ml-0.5">Theme</span>
                    </Button>
                  </ComponentTheme>
                </div>
              )}
              <div className="flex items-center">
                {authorized && image && (
                  <div className="mr-2 size-12">
                    <div className="relative size-12">
                      <Image
                        src={URL.createObjectURL(image)}
                        alt="Uploaded"
                        width={12}
                        height={12}
                        crossOrigin="anonymous"
                        className="size-12 rounded-md object-contain"
                      />
                      <button
                        type="button"
                        className="absolute right-0 top-0 cursor-pointer rounded-full bg-black/50 p-1"
                        onClick={handleImageRemove}
                        disabled={isLoading}
                      >
                        <XIcon className="size-4 text-white" />
                      </button>
                    </div>
                  </div>
                )}
                {authorized && (
                  <ImageSelector
                    fileInputRef={fileInputRef}
                    disabled={isLoading}
                    handleButtonClick={handleButtonClick}
                    handleImageChange={handleImageChange}
                  />
                )}
              </div>
            </div>
            <div className="flex w-full flex-col items-start space-y-1 border-t p-2">
              <Textarea
                ref={inputRef}
                autoFocus
                disabled={isLoading}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                minLength={2}
                placeholder="Add a button, modify a div..."
                required
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    if (event.shiftKey) {
                      return;
                    }

                    event.preventDefault();

                    handleSubmit(event);
                  }
                }}
                className="max-h-[400px] min-h-[76px] border-none bg-background pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div
                className={cn(
                  "my-0.5 text-xs text-foreground transition-opacity",
                  input.length <= 3 && "opacity-0",
                )}
              >
                Use <kbd className="rounded-sm bg-secondary p-1">Shift</kbd> +{" "}
                <kbd className="rounded-sm bg-secondary p-1">Return</kbd> for a
                new line
              </div>
              <div className="flex w-full items-center">
                <Button
                  size="sm"
                  loading={isLoading}
                  type="submit"
                  className="flex w-full items-center"
                >
                  <CircleFadingArrowUp className="size-3" />
                  <span>Iterate</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-full hover:bg-background lg:w-auto"
                  disabled={isLoading || isImprovingLoading || hasImproved}
                  onClick={handleImprovePrompt}
                >
                  <WandSparkles className="size-3" />
                  {isImprovingLoading
                    ? "Improving prompt..."
                    : hasImproved
                      ? "Prompt improved"
                      : "Improve prompt"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
