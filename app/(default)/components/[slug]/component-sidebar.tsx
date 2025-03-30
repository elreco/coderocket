import {
  BookOpen,
  ChevronsRight,
  CircleFadingArrowUp,
  MessageSquare,
  Paintbrush,
  WandSparkles,
  X,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";

import { getSubscription } from "@/app/supabase-server";
import { ImageSelector } from "@/components/image-selector";
import { TextareaWithLimit } from "@/components/textarea-with-limit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserWidget } from "@/components/user-widget";
import { useComponentContext } from "@/context/component-context";
import { useWebcontainer } from "@/context/webcontainer-context";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  ChatFile,
  ContentChunk,
  extractDirectFiles,
  extractFilesFromCompletion,
  hasArtifacts,
  splitContentIntoChunks,
} from "@/utils/completion-parser";
import {
  avatarApi,
  Framework,
  FREE_CHAR_LIMIT,
  maxImageSize,
  storageUrl,
} from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { createClient } from "@/utils/supabase/client";

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
    authorized,
    user,
    isLoading,
    selectedVersion,
    completion,
    handleVersionSelect,
    handleSubmitToAI,
    messages,
    input,
    setInput,
    chatId,
    selectedFramework,
    image,
    setImage,
    defaultImage,
    isLengthError,
  } = useComponentContext();
  const { buildError } = useWebcontainer();

  const [isLoaderVisible, setLoaderVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentVersionRef = useRef<HTMLDivElement | null>(null);
  const [streamingChunks, setStreamingChunks] = useState<ContentChunk[]>([]);
  const [activeTab, setActiveTab] = useState("chat");
  const [hasImproved, setHasImproved] = useState(false);
  const [isImprovingLoading, setIsImprovingLoading] = useState(false);
  const [files, setFiles] = useState<ChatFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputIsValid, setInputIsValid] = useState(true);
  const [subscription, setSubscription] = useState<
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null
  >(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

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

  useEffect(() => {
    // Charger le statut de l'abonnement au chargement du composant
    const fetchSubscription = async () => {
      const supabase = await createClient();
      try {
        setIsLoadingSubscription(true);
        const { data } = await supabase.auth.getUser();
        setIsLoggedIn(!!data?.user?.id);
        const sub = await getSubscription();
        setSubscription(sub);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, []);

  const submitPrompt = (promptText: string) => {
    handleSubmitToAI(promptText);
    setActiveTab("chat");
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      toast({
        variant: "destructive",
        title: "Empty input",
        description: "Please enter a prompt before submitting",
        duration: 4000,
      });
      return;
    }

    if (!inputIsValid) {
      toast({
        variant: "destructive",
        title: "Prompt is too long",
        description: `Your prompt exceeds the character limit. Please shorten it to continue.`,
        duration: 4000,
      });
      return;
    }

    submitPrompt(input);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Faire défiler vers la version actuelle lorsque l'onglet "history" est sélectionné
    if (value === "history") {
      setTimeout(() => {
        if (currentVersionRef.current) {
          currentVersionRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);
    }
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
        title: "Prompt is empty",
        description: "Please enter a prompt before improving it.",
        duration: 4000,
      });
      setIsImprovingLoading(false);
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
        duration: 4000,
      });
      setIsImprovingLoading(false);
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

  useEffect(() => {
    if (isLoading && completion) {
      // Extraction unique des fichiers
      let extractedFiles: ChatFile[] = [];
      let newChunks: ContentChunk[] = [];

      // Vérifier d'abord les balises tailwindaiFile directement
      if (completion.includes("<tailwindaiFile")) {
        extractedFiles = extractDirectFiles(completion);

        // Si des fichiers ont été extraits directement sans artifact, créer un "faux" artifact
        if (
          extractedFiles.length > 0 &&
          !completion.includes("<tailwindaiArtifact")
        ) {
          const artificialArtifact = `<tailwindaiArtifact title="Generated Files">
${extractedFiles.map((file) => `<tailwindaiFile name="${file.name || "unnamed"}">${file.content}</tailwindaiFile>`).join("\n")}
</tailwindaiArtifact>`;

          newChunks = [
            {
              type: "artifact",
              content: artificialArtifact,
            },
          ];
        } else {
          // Sinon utiliser le découpage standard
          newChunks = splitContentIntoChunks(completion);
        }
      } else {
        // Pas de balises tailwindaiFile, utiliser le découpage standard
        newChunks = splitContentIntoChunks(completion);

        // Vérifier les artifacts comme avant
        const hasArtifactResult = hasArtifacts(completion);
        if (hasArtifactResult) {
          extractedFiles = extractFilesFromCompletion(completion);
        }
      }

      // Filtrer les chunks pour ne garder que ceux qui ne sont pas des fichiers
      newChunks = newChunks.filter((chunk) => {
        if (chunk.type === "artifact") return true;
        // Pour les chunks de type "text", vérifier s'ils ne contiennent pas de balises tailwindaiFile
        return !chunk.content.includes("<tailwindaiFile");
      });

      // Mettre à jour les états ensemble pour éviter les sauts
      setStreamingChunks(newChunks);
      setFiles(extractedFiles);
    } else if (!isLoading) {
      // Réinitialiser les états lorsque le chargement est terminé
      setStreamingChunks([]);
      setFiles([]);
    }
  }, [completion, isLoading]);

  const handleFileClick = (version: number) => {
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
              duration: 4000,
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
        duration: 4000,
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
                <TooltipProvider key={m.id}>
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                      <div
                        ref={
                          m.version === selectedVersion
                            ? currentVersionRef
                            : null
                        }
                        onClick={() =>
                          m.version !== selectedVersion &&
                          handleFileClick(m.version)
                        }
                        className={cn(
                          "rounded-lg border bg-background p-4 shadow-sm",
                          m.version === selectedVersion
                            ? "cursor-default hover:bg-background"
                            : isLoading
                              ? "cursor-not-allowed opacity-70"
                              : "cursor-pointer hover:bg-secondary",
                        )}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex w-full items-center gap-2">
                            <Avatar className="size-8">
                              <AvatarImage
                                src={user?.avatar_url || undefined}
                              />
                              <AvatarFallback>
                                <img
                                  src={`${avatarApi}${user?.full_name}`}
                                  alt="logo"
                                  className="size-full"
                                />
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
                    </TooltipTrigger>
                    {isLoading && (
                      <TooltipContent side="top">
                        <p>
                          Please wait for the component to load before changing
                          versions
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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
            <UserWidget
              id={user?.id}
              createdAt={new Date().toISOString()}
              userAvatarUrl={user?.avatar_url}
              userFullName={user?.full_name}
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
                <div className="ml-2 flex flex-col items-start">
                  <h2
                    className={cn(
                      "text-lg font-semibold transition-all group-hover:text-primary",
                    )}
                  >
                    Generating version...
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {getRelativeDate(new Date().toISOString())}
                  </p>
                </div>
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
            <div className="flex w-full items-center justify-between space-x-1 border-t p-2">
              <div className="flex items-center space-x-2">
                {selectedFramework === Framework.HTML && !isLengthError && (
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
                {image && (
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -right-2 -top-2 size-5 rounded-full bg-background p-0"
                        onClick={handleImageRemove}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {!isLoading && !isLengthError && !buildError && (
                  <ImageSelector
                    fileInputRef={fileInputRef}
                    disabled={isLoading}
                    handleButtonClick={handleButtonClick}
                    handleImageChange={handleImageChange}
                  />
                )}
                {/* Continue your work button */}
                {!isLoading && isLengthError && (
                  <Button
                    type="button"
                    size="sm"
                    className="mr-2"
                    onClick={() => {
                      const continuePrompt = "Continue where you left off";
                      setInput(continuePrompt);
                      submitPrompt(continuePrompt);
                    }}
                  >
                    <RefreshCw className=" size-4" />
                    Continue generation
                  </Button>
                )}
                {!isLoading && buildError && (
                  <Button
                    type="button"
                    size="sm"
                    className="mr-2"
                    onClick={() => {
                      const errorContent = buildError.content;
                      const truncatedContent =
                        errorContent.length > FREE_CHAR_LIMIT
                          ? errorContent.substring(0, FREE_CHAR_LIMIT)
                          : errorContent;
                      const continuePrompt =
                        "Fix the following error: " + truncatedContent;
                      setInput(continuePrompt);
                      handleSubmitToAI(continuePrompt);
                    }}
                  >
                    <WandSparkles className="size-4" />
                    Fix errors
                  </Button>
                )}
              </div>
            </div>
            <div className="flex w-full flex-col items-start space-y-1 border-t p-2">
              <TextareaWithLimit
                ref={inputRef}
                autoFocus
                disabled={isLoading}
                isLoading={isLoading}
                value={input}
                onChange={(value, isValid) => {
                  setInput(value);
                  setInputIsValid(isValid);
                }}
                displayMessage={false}
                subscription={subscription}
                isLoadingSubscription={isLoadingSubscription}
                isLoggedIn={isLoggedIn}
                showCounter={true}
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
              <div className="flex w-full items-center space-x-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="size-9 p-0 hover:bg-background"
                        disabled={
                          isLoading || isImprovingLoading || hasImproved
                        }
                        onClick={handleImprovePrompt}
                      >
                        <WandSparkles
                          className={cn(
                            "size-4",
                            isImprovingLoading && "animate-spin",
                            hasImproved && "text-primary",
                          )}
                        />
                        <span className="sr-only">
                          {isImprovingLoading
                            ? "Improving prompt..."
                            : hasImproved
                              ? "Prompt improved"
                              : "Improve prompt"}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isImprovingLoading
                        ? "Improving prompt..."
                        : hasImproved
                          ? "Prompt improved"
                          : "Improve prompt"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  size="sm"
                  loading={isLoading}
                  type="submit"
                  className="flex w-full items-center"
                >
                  <CircleFadingArrowUp className="size-3" />
                  <span>Iterate</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
