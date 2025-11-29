import {
  BookOpen,
  ChevronsRight,
  CircleFadingArrowUp,
  MessageSquare,
  Paintbrush,
  WandSparkles,
  RefreshCw,
  CheckCircle,
  Loader,
  Loader2,
  Settings,
  Github,
  Plug2,
  Rocket,
  Database,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";

import { getSubscription } from "@/app/supabase-server";
import { CloneAnotherPageButton } from "@/components/clone-another-page-button";
import { FigmaImportButton } from "@/components/figma-import-button";
import { FileBadge } from "@/components/file-badge";
import { ImageUploadArea } from "@/components/image-upload-area";
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
import { useBuilder } from "@/context/builder-context";
import { useComponentContext } from "@/context/component-context";
import { toast } from "@/hooks/use-toast";
import { cn, truncateMiddle } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  ChatFile,
  ContentChunk,
  extractDirectFiles,
  extractFilesFromCompletion,
  hasArtifacts,
  splitContentIntoChunks,
  createContinuePrompt,
  categorizeFiles,
} from "@/utils/completion-parser";
import {
  avatarApi,
  Framework,
  FREE_CHAR_LIMIT,
  maxImagesUpload,
  storageUrl,
} from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { validateFile } from "@/utils/file-helper";
import { createClient } from "@/utils/supabase/client";

import ComponentTheme from "./(settings)/component-theme";
import DeploymentContent from "./(settings)/deployment-content";
import GithubSync from "./(settings)/github-sync";
import IntegrationsContent from "./(settings)/integrations-content";
import SettingsContent from "./(settings)/settings-content";
import { improvePromptByChatId } from "./actions";
import { ChunkReader } from "./chunk-reader";
import ComponentChatFiles from "./component-chat-files";
import { ComponentSidebarSkeleton } from "./component-sidebar-skeleton";
import { Markdown } from "./markdown";
import { PromptFiles } from "./prompt-file";

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
    isWebcontainerReady,
    files,
    setFiles,
    isLengthError,
    fetchedChat,
    sidebarTab: activeTab,
    setSidebarTab: setActiveTab,
    setIsScrapingWebsite,
    setIsContinuingFromLengthError,
  } = useComponentContext();
  const { buildError, loadingState } = useBuilder();

  const [isLoaderVisible, setLoaderVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentVersionRef = useRef<HTMLDivElement | null>(null);
  const [streamingChunks, setStreamingChunks] = useState<ContentChunk[]>([]);
  const [hasImproved, setHasImproved] = useState(false);
  const [isImprovingLoading, setIsImprovingLoading] = useState(false);
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHasImproved(false);
  }, [selectedVersion]);

  useEffect(() => {
    if (isLoading) {
      setHasImproved(false);
    }
  }, [isLoading]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputIsValid, setInputIsValid] = useState(true);
  const hasAssistantMessage = useMemo(
    () => messages.some((m) => m.role === "assistant"),
    [messages],
  );
  const selectedAssistantMessage = useMemo(
    () =>
      messages.find(
        (m) => m.role === "assistant" && m.version === selectedVersion,
      ),
    [messages, selectedVersion],
  );
  const [subscription, setSubscription] = useState<
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null
  >(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [scrapingStatus, setScrapingStatus] = useState<{
    progress: number;
    screenshot?: string | null;
    error?: string | null;
  }>({
    progress: 0,
    screenshot: null,
    error: null,
  });
  const [isCloneAnotherPageActive, setIsCloneAnotherPageActive] =
    useState(false);
  const [currentCloneUrl, setCurrentCloneUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaderVisible(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Charger le statut de l'abonnement au chargement du composant
    const fetchSubscription = async () => {
      const supabase = await createClient();
      try {
        setIsLoadingSubscription(true);
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        setIsLoggedIn(!!userId);

        if (userId) {
          const sub = await getSubscription(userId);
          setSubscription(sub);
        } else {
          setSubscription(null);
        }
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

    setIsContinuingFromLengthError(false);
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

  const handleFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (files.length === 1 && fileInputRef.current) {
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

  const containsIncompleteTag = (text: string): boolean => {
    const openingTags = ["<coderocketArtifact", "<coderocketFile"];
    const closingTags = ["</coderocketArtifact>", "</coderocketFile>"];

    for (let i = 0; i < openingTags.length; i++) {
      const openTag = openingTags[i];
      const closeTag = closingTags[i];

      if (text.includes(openTag) && !text.includes(closeTag)) {
        return true;
      }

      if (
        text.includes("<") &&
        text.includes("/") &&
        closeTag.startsWith(text.substring(text.lastIndexOf("<")))
      ) {
        return true;
      }
    }

    for (const tag of [...openingTags, ...closingTags]) {
      for (let i = 3; i < tag.length; i++) {
        const fragment = tag.substring(0, i);
        if (text.endsWith(fragment)) {
          return true;
        }
      }
    }

    return false;
  };

  useEffect(() => {
    if (isLoading && completion) {
      // Extraction unique des fichiers
      let extractedFiles: ChatFile[] = [];
      let newChunks: ContentChunk[] = [];

      // Vérifier d'abord les balises coderocketFile directement
      if (completion.includes("<coderocketFile")) {
        extractedFiles = extractDirectFiles(completion);

        // Si des fichiers ont été extraits directement sans artifact, créer un "faux" artifact
        if (
          extractedFiles.length > 0 &&
          !completion.includes("<coderocketArtifact")
        ) {
          const artificialArtifact = `<coderocketArtifact title="Generated Files">
${extractedFiles.map((file) => `<coderocketFile name="${file.name || "unnamed"}">${file.content}</coderocketFile>`).join("\n")}
</coderocketArtifact>`;

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
        // Pas de balises coderocketFile, utiliser le découpage standard
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
        if (chunk.type !== "text") return true;
        if (chunk.content.includes("<coderocketFile")) return false;
        if (containsIncompleteTag(chunk.content)) return false;
        return true;
      });

      // Mettre à jour les états ensemble pour éviter les sauts
      setStreamingChunks(newChunks);
      setChatFiles(extractedFiles);
    } else if (!isLoading) {
      setStreamingChunks([]);
      setChatFiles([]);
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
          if (!file) continue;

          const validation = validateFile(file);
          if (!validation.valid) {
            toast({
              variant: "destructive",
              title: "Invalid file",
              description: validation.error,
              duration: 4000,
            });
            break;
          }

          if (files.length >= maxImagesUpload) {
            toast({
              variant: "destructive",
              title: "Too many files",
              description: `Maximum ${maxImagesUpload} files allowed`,
              duration: 4000,
            });
            break;
          }

          setFiles((prev: File[]) => [...prev, file]);
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
  }, [inputRef, files.length, setFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const validFiles: File[] = [];

    for (const file of newFiles) {
      const validation = validateFile(file);

      if (!validation.valid) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: validation.error,
          duration: 4000,
        });
        continue;
      }

      if (files.length + validFiles.length >= maxImagesUpload) {
        toast({
          variant: "destructive",
          title: "Too many files",
          description: `Maximum ${maxImagesUpload} files allowed`,
          duration: 4000,
        });
        break;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }

    if (e.target) {
      e.target.value = "";
    }
  };

  const startScrapeSimulation = useCallback(() => {
    setIsScrapingWebsite(true);
    setScrapingStatus({
      progress: 5,
      screenshot: null,
      error: null,
    });

    let currentProgress = 5;
    const intervalId = setInterval(() => {
      currentProgress += Math.random() * 6 + 1;
      if (currentProgress > 92) currentProgress = 92;
      setScrapingStatus((prev) => ({
        ...prev,
        progress: currentProgress,
        error: null,
      }));
    }, 900);

    return intervalId;
  }, [setIsScrapingWebsite]);

  useEffect(() => {
    if (
      fetchedChat?.clone_url &&
      ((selectedVersion === -1 && isLoading) || isCloneAnotherPageActive) &&
      isLoading
    ) {
      const intervalId = startScrapeSimulation();

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
          setIsScrapingWebsite(false);
        }
      };
    }
  }, [
    fetchedChat?.clone_url,
    selectedVersion,
    isLoading,
    startScrapeSimulation,
    isCloneAnotherPageActive,
    setIsScrapingWebsite,
  ]);

  useEffect(() => {
    if (!isLoading && isCloneAnotherPageActive) {
      setIsCloneAnotherPageActive(false);
      setCurrentCloneUrl(null);
    }
  }, [isLoading, isCloneAnotherPageActive]);

  useEffect(() => {
    if (!isLoading) {
      setIsScrapingWebsite(false);
      setScrapingStatus((prev) => ({
        progress: prev.progress >= 100 ? prev.progress : 100,
        screenshot:
          selectedAssistantMessage?.screenshot ?? prev.screenshot ?? null,
        error: null,
      }));
    }
  }, [isLoading, selectedAssistantMessage, setIsScrapingWebsite]);

  return (
    <div
      className={cn(
        "bg-secondary relative flex size-full flex-col overflow-hidden border-l-0 xl:flex-row xl:border-l",
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
        className="w-full xl:hidden"
      >
        <TabsList
          className={cn(
            "grid w-full rounded-none",
            authorized
              ? selectedFramework === Framework.HTML
                ? "grid-cols-5"
                : "grid-cols-6"
              : "grid-cols-2",
          )}
        >
          <TabsTrigger value="chat" disabled={isLoading}>
            <MessageSquare className="size-4" />
          </TabsTrigger>
          <TabsTrigger value="history" disabled={isLoading}>
            <BookOpen className="size-4" />
          </TabsTrigger>
          {authorized && (
            <TabsTrigger value="github" disabled={isLoading}>
              <Github className="size-4" />
            </TabsTrigger>
          )}
          {authorized && selectedFramework !== Framework.HTML && (
            <TabsTrigger value="integrations" disabled={isLoading}>
              <Plug2 className="size-4" />
            </TabsTrigger>
          )}
          {authorized && (
            <TabsTrigger value="deployment" disabled={isLoading}>
              <Rocket className="size-4" />
            </TabsTrigger>
          )}
          {authorized && (
            <TabsTrigger value="settings" disabled={isLoading}>
              <Settings className="size-4" />
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <div className="bg-background flex flex-1 flex-col overflow-hidden">
        {activeTab === "chat" && (
          <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
            <MessageSquare className="size-4" />
            <h3 className="text-base font-medium">Chat</h3>
          </div>
        )}
        {activeTab === "history" && (
          <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
            <BookOpen className="size-4" />
            <h3 className="text-base font-medium">History</h3>
          </div>
        )}
        {authorized && activeTab === "github" && (
          <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
            <Github className="size-4" />
            <h3 className="text-base font-medium">GitHub Sync</h3>
          </div>
        )}
        {authorized &&
          selectedFramework !== Framework.HTML &&
          activeTab === "integrations" && (
            <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
              <Plug2 className="size-4" />
              <h3 className="text-base font-medium">Integrations</h3>
            </div>
          )}
        {authorized && activeTab === "deployment" && (
          <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
            <Rocket className="size-4" />
            <h3 className="text-base font-medium">Deployment</h3>
          </div>
        )}
        {authorized && activeTab === "settings" && (
          <div className="bg-background flex h-12 items-center gap-2 px-4 py-1.5">
            <Settings className="size-4" />
            <h3 className="text-base font-medium">Settings</h3>
          </div>
        )}

        <div
          ref={containerRef}
          className={cn(
            "border-border bg-secondary flex flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-smooth border-r",
            activeTab === "chat" && "rounded-r-lg border-y",
            activeTab !== "chat" && "rounded-tr-lg border-t",
          )}
        >
          {isLoaderVisible && (
            <div className="bg-secondary absolute inset-0 z-10 flex size-full flex-col items-start p-4">
              <ComponentSidebarSkeleton />
            </div>
          )}
          {activeTab === "chat" &&
            messages
              .filter((m) => {
                if (m.version !== selectedVersion) return false;
                if (isLoading && m.role === "assistant") return false;
                return true;
              })
              .map((m) => <ComponentChatFiles message={m} key={m.id} />)}
          {activeTab === "history" && (
            <div className="flex flex-col gap-2 p-3">
              {!isLoading &&
                messages
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
                              "border-primary/20 bg-primary/5 rounded-lg border p-2 transition-all",
                              m.version === selectedVersion
                                ? "border-primary/30 cursor-default"
                                : isLoading
                                  ? "cursor-not-allowed opacity-70"
                                  : "hover:border-primary/30 cursor-pointer",
                            )}
                          >
                            <div className="flex w-full items-center justify-between gap-2 p-1">
                              <div className="flex w-full items-center gap-2">
                                <Avatar className="border-primary size-8 border">
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
                                  <span className="text-sm font-semibold">
                                    {user?.full_name}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    Version #{m.version}
                                  </span>
                                </div>
                              </div>
                              {m.version === selectedVersion ? (
                                <Badge className="rounded-full">Current</Badge>
                              ) : (
                                <ChevronsRight className="size-4" />
                              )}
                            </div>
                            <p className="mt-2 truncate text-sm">{m.content}</p>
                            <p className="text-muted-foreground mt-2 text-right text-xs">
                              {getRelativeDate(m.created_at)}
                            </p>
                          </div>
                        </TooltipTrigger>
                        {isLoading && (
                          <TooltipContent side="top">
                            <p>
                              Please wait for the component to load before
                              changing versions
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  ))}
            </div>
          )}
          {!isLoading && authorized && activeTab === "github" && (
            <div className="p-4">
              <GithubSync closeSheet={() => {}} />
            </div>
          )}
          {!isLoading &&
            authorized &&
            selectedFramework !== Framework.HTML &&
            activeTab === "integrations" && <IntegrationsContent />}
          {!isLoading && authorized && activeTab === "deployment" && (
            <DeploymentContent />
          )}
          {!isLoading && authorized && activeTab === "settings" && (
            <SettingsContent />
          )}
          <div
            className={cn(
              "flex flex-col p-3",
              "transition-all duration-200",
              isLoading &&
                input &&
                (selectedVersion ?? 0) > 0 &&
                !messages.some(
                  (m) => m.version === selectedVersion && m.role === "user",
                )
                ? "block"
                : "hidden",
            )}
          >
            <div className="border-primary/20 bg-primary/5 flex flex-col gap-3 rounded-lg border p-2 transition-all">
              <UserWidget
                id={user?.id}
                createdAt={new Date().toISOString()}
                userAvatarUrl={user?.avatar_url}
                userFullName={user?.full_name}
              />
              <Markdown>{input}</Markdown>
              <PromptFiles
                files={files.length > 0 ? files : undefined}
                storageUrl={storageUrl}
              />
            </div>
          </div>
          <div
            className={cn(
              "flex flex-col",
              "transition-all duration-200",
              isLoading ? "block" : "hidden",
            )}
          >
            <div className="flex w-full flex-col gap-2 overflow-x-auto p-3 text-sm wrap-break-word">
              {input && (
                <div className="flex items-center">
                  <Avatar className="mr-2 size-10 rounded-none">
                    <AvatarImage src="/logo-white.png" />
                    <AvatarFallback>T</AvatarFallback>
                  </Avatar>
                  <div className="ml-2 flex flex-col items-start">
                    <h2
                      className={cn(
                        "group-hover:text-primary text-lg font-semibold transition-all",
                      )}
                    >
                      Generating version...
                    </h2>
                    <p className="text-muted-foreground text-xs">
                      {getRelativeDate(new Date().toISOString())}
                    </p>
                  </div>
                </div>
              )}
              {fetchedChat?.clone_url &&
                ((selectedVersion === -1 && isLoading) ||
                  isCloneAnotherPageActive) && (
                  <div className="border-primary/30 bg-primary/10 mt-2 mb-4 flex flex-col gap-3 rounded-lg border p-4 text-sm">
                    <div className="flex items-center">
                      {!isLoading ? (
                        <CheckCircle className="mr-2 size-5 text-green-500" />
                      ) : (
                        <Loader className="text-primary mr-2 size-5 animate-spin" />
                      )}
                      {!isLoading ? (
                        <p className="font-medium text-green-600">
                          Website{" "}
                          {truncateMiddle(
                            (currentCloneUrl || fetchedChat.clone_url)
                              .replace(/^https?:\/\/(www\.)?/i, "")
                              .replace(/\/$/, ""),
                            35,
                          )}{" "}
                          analyzed
                        </p>
                      ) : (
                        <p className="text-primary font-medium">
                          Scraping{" "}
                          {truncateMiddle(
                            (currentCloneUrl || fetchedChat.clone_url)
                              .replace(/^https?:\/\/(www\.)?/i, "")
                              .replace(/\/$/, ""),
                            35,
                          )}
                        </p>
                      )}
                    </div>
                    {isLoading ? (
                      <p className="ml-2 text-xs text-orange-500">
                        This may take a while
                      </p>
                    ) : null}

                    {scrapingStatus.error && (
                      <div className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs">
                        <p className="font-medium text-red-600">
                          Analysis encountered an issue:
                        </p>
                        <p className="text-muted-foreground">
                          {scrapingStatus.error}
                        </p>
                        <p className="mt-1 text-xs">
                          Using fallback analysis methods instead.
                        </p>
                      </div>
                    )}

                    {!scrapingStatus.error && (
                      <>
                        <div className="bg-primary/10 relative h-2 w-full overflow-hidden rounded-full">
                          <div
                            className="from-primary to-primary/80 h-full bg-linear-to-r transition-all duration-1000 ease-in-out"
                            style={{ width: `${scrapingStatus.progress}%` }}
                          >
                            <div className="absolute inset-0 animate-pulse bg-linear-to-r from-transparent via-white/20 to-transparent" />
                          </div>
                        </div>

                        <div className="mt-3 flex flex-col gap-2">
                          {[
                            {
                              progress: 0,
                              label: "Initializing scraper",
                              detail: "Connecting to website...",
                              icon: "⚙️",
                            },
                            {
                              progress: 20,
                              label: "Loading page",
                              detail: "Fetching HTML & assets...",
                              icon: "🌐",
                            },
                            {
                              progress: 40,
                              label: "Extracting content",
                              detail: "Analyzing structure & text...",
                              icon: "📄",
                            },
                            {
                              progress: 60,
                              label: "Capturing design",
                              detail: "Colors, fonts & layout...",
                              icon: "🎨",
                            },
                            {
                              progress: 80,
                              label: "Taking screenshot",
                              detail: "Visual reference...",
                              icon: "📸",
                            },
                            {
                              progress: 95,
                              label: "Finalizing",
                              detail: "Preparing for AI...",
                              icon: "✨",
                            },
                          ].map((step, index) => {
                            const nextStepProgress =
                              [20, 40, 60, 80, 95, 100][index] || 100;
                            const isActive =
                              scrapingStatus.progress >= step.progress &&
                              scrapingStatus.progress < nextStepProgress;
                            const isCompleted =
                              scrapingStatus.progress >= nextStepProgress;

                            return (
                              <div
                                key={step.label}
                                className={cn(
                                  "flex items-start gap-3 rounded-lg border p-2.5 transition-all duration-700 ease-in-out",
                                  isActive &&
                                    "border-primary/40 bg-primary/5 scale-[1.01] shadow-xs",
                                  isCompleted &&
                                    "border-green-500/30 bg-green-500/5 opacity-70",
                                  !isActive &&
                                    !isCompleted &&
                                    "border-border/50 opacity-50",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex size-7 shrink-0 items-center justify-center rounded-full text-sm transition-all",
                                    isActive && "bg-primary/20 animate-pulse",
                                    isCompleted && "bg-primary/10",
                                    !isActive && !isCompleted && "bg-muted/50",
                                  )}
                                >
                                  {isCompleted ? (
                                    <svg
                                      className="text-primary size-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  ) : (
                                    <span>{step.icon}</span>
                                  )}
                                </div>
                                <div className="flex-1 pt-0.5">
                                  <p
                                    className={cn(
                                      "text-xs font-medium transition-colors",
                                      isActive && "text-foreground",
                                      !isActive && "text-muted-foreground",
                                    )}
                                  >
                                    {step.label}
                                  </p>
                                  <p
                                    className={cn(
                                      "text-xs transition-colors",
                                      isActive && "text-muted-foreground",
                                      !isActive && "text-muted-foreground/60",
                                    )}
                                  >
                                    {step.detail}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {scrapingStatus.screenshot && !scrapingStatus.error && (
                      <div className="border-primary/20 bg-primary/5 mt-4 overflow-hidden rounded-lg border p-3">
                        <p className="text-foreground mb-2 flex items-center gap-2 text-xs font-semibold">
                          <svg
                            className="text-primary size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Visual Reference Captured
                        </p>
                        <div className="border-border overflow-hidden rounded-md border">
                          <img
                            src={
                              scrapingStatus.screenshot.startsWith("http")
                                ? scrapingStatus.screenshot
                                : `data:image/jpeg;base64,${scrapingStatus.screenshot}`
                            }
                            alt="Website screenshot"
                            className="h-auto w-full"
                            onError={() => {
                              console.error("Screenshot load error");
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
            {isLoading && (
              <div className="flex flex-col px-3 pb-1 transition-all">
                <ChunkReader
                  chunks={streamingChunks}
                  files={chatFiles}
                  handleFileClick={handleFileClick}
                  chatId={chatId}
                  messageId={0}
                />
              </div>
            )}
            <div className="flex flex-col px-3 pb-1">
              <div className="mt-2 flex gap-1">
                <span className="bg-foreground/50 size-2 animate-[typing_1s_ease-in-out_infinite] rounded-full"></span>
                <span className="bg-foreground/50 size-2 animate-[typing_1s_ease-in-out_infinite] rounded-full delay-300"></span>
                <span className="bg-foreground/50 size-2 animate-[typing_1s_ease-in-out_infinite] rounded-full delay-600"></span>
              </div>
            </div>
          </div>
        </div>
        {activeTab === "chat" && (
          <form
            className="flex w-full items-center"
            onSubmit={(e) => handleSubmit(e)}
          >
            {authorized && (
              <div className="bg-background flex w-full flex-col">
                <div className="flex w-full items-center justify-between space-x-1 px-2 pt-2">
                  <div className="flex items-center gap-2">
                    {/* Continue your work button */}
                    {!isLoading && isLengthError && (
                      <Button
                        type="button"
                        size="sm"
                        className="mr-2"
                        onClick={() => {
                          setIsContinuingFromLengthError(true);
                          const continuePrompt = createContinuePrompt(messages);
                          setInput(continuePrompt);
                          submitPrompt(continuePrompt);
                        }}
                      >
                        <RefreshCw className=" size-4" />
                        Continue generation
                      </Button>
                    )}
                    {!isLoading && loadingState === "error" && buildError && (
                      <Button
                        type="button"
                        size="sm"
                        className="mr-2"
                        onClick={() => {
                          const errorContent =
                            buildError.errors?.join("\n\n") || "";
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
                    {!isLoading &&
                      chatFiles.length > 0 &&
                      (() => {
                        const categorized = categorizeFiles(chatFiles);
                        const hasUnexecutedMigration =
                          categorized.migrations.some((migration: ChatFile) => {
                            const currentMessage = messages.find(
                              (m) =>
                                m.version === selectedVersion &&
                                m.role === "assistant",
                            );
                            const migrationsExecuted =
                              currentMessage?.migrations_executed as Array<{
                                name: string;
                                executed_at: string;
                              }> | null;
                            const isExecuted = (migrationsExecuted || []).some(
                              (m) => m.name === migration.name,
                            );
                            return !isExecuted;
                          });
                        return (
                          hasUnexecutedMigration && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="mr-2"
                              onClick={() => {
                                const migrationSection = document.querySelector(
                                  "[data-migration-runner]",
                                );
                                if (migrationSection) {
                                  migrationSection.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                  });
                                }
                              }}
                            >
                              <Database className="size-4" />
                              Run Migration
                            </Button>
                          )
                        );
                      })()}
                  </div>
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
                            <Paintbrush className="size-4 shrink-0" />
                            <span className="ml-0.5 hidden sm:inline">
                              Theme
                            </span>
                          </Button>
                        </ComponentTheme>
                      </div>
                    )}
                    {!isLoadingSubscription &&
                      !(
                        buildError &&
                        buildError.errors &&
                        buildError.errors.length > 0
                      ) && (
                        <>
                          <ImageUploadArea
                            fileInputRef={fileInputRef}
                            disabled={
                              isLoading ||
                              isLengthError ||
                              !!buildError ||
                              files.length >= maxImagesUpload
                            }
                            handleButtonClick={handleButtonClick}
                            handleImageChange={handleFileChange}
                            onDrop={(droppedFiles) => {
                              const validFiles: File[] = [];

                              for (const file of droppedFiles) {
                                if (
                                  files.length + validFiles.length >=
                                  maxImagesUpload
                                ) {
                                  toast({
                                    variant: "destructive",
                                    title: "Too many files",
                                    description: `Maximum ${maxImagesUpload} files allowed`,
                                    duration: 4000,
                                  });
                                  break;
                                }

                                const validation = validateFile(file);
                                if (!validation.valid) {
                                  toast({
                                    variant: "destructive",
                                    title: "Invalid file",
                                    description: validation.error,
                                    duration: 4000,
                                  });
                                  continue;
                                }

                                validFiles.push(file);
                              }

                              if (validFiles.length > 0) {
                                setFiles((prev) => [...prev, ...validFiles]);
                              }
                            }}
                            label="Files"
                            subscription={subscription}
                            isLoggedIn={isLoggedIn}
                          />
                          <FigmaImportButton
                            disabled={
                              isLoading || isLengthError || !!buildError
                            }
                            framework={selectedFramework}
                            subscription={subscription}
                            isLoggedIn={isLoggedIn}
                            onFileImport={(file) => {
                              setFiles((prev) => [...prev, file]);
                            }}
                          />
                        </>
                      )}
                  </div>
                </div>
                {fetchedChat?.clone_url && !isLoadingSubscription && (
                  <div className="w-full p-2">
                    <div className="flex justify-end">
                      <CloneAnotherPageButton
                        originalUrl={fetchedChat.clone_url}
                        disabled={isLoading || isLengthError || !!buildError}
                        onSubmit={(url) => {
                          const clonePrompt = `Clone another page: ${url}`;
                          setInput(clonePrompt);
                          setIsCloneAnotherPageActive(true);
                          setCurrentCloneUrl(url);
                          setScrapingStatus({
                            progress: 0,
                            screenshot: null,
                            error: null,
                          });
                          submitPrompt(clonePrompt);
                        }}
                      />
                    </div>
                  </div>
                )}
                {!isLoading && files.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto p-2">
                    {files.map((file, index) => (
                      <FileBadge
                        key={`${file.name}-${index}`}
                        file={file}
                        onRemove={() => handleFileRemove(index)}
                        disabled={isLoading || isLengthError || !!buildError}
                      />
                    ))}
                  </div>
                )}
                <div className="flex w-full flex-col items-start space-y-1 p-2">
                  <TextareaWithLimit
                    ref={inputRef}
                    autoFocus
                    disabled={
                      isLoading ||
                      isLengthError ||
                      (!isWebcontainerReady && hasAssistantMessage)
                    }
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
                    className="bg-background max-h-[400px] min-h-[76px] border-none pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div
                    className={cn(
                      "text-foreground my-0.5 text-xs transition-opacity",
                      input.length <= 3 && "opacity-0",
                    )}
                  >
                    Use <kbd className="bg-secondary rounded-md p-1">Shift</kbd>{" "}
                    + <kbd className="bg-secondary rounded-md p-1">Return</kbd>{" "}
                    for a new line
                  </div>
                  <div className="flex w-full items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="hover:bg-background size-9 p-0"
                            disabled={
                              isLoading || isImprovingLoading || hasImproved
                            }
                            onClick={handleImprovePrompt}
                          >
                            {isImprovingLoading ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <WandSparkles
                                className={cn(
                                  "size-4",
                                  hasImproved && "text-primary",
                                )}
                              />
                            )}
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
                      disabled={
                        isLoading ||
                        (!isWebcontainerReady && hasAssistantMessage) ||
                        isLengthError
                      }
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
        )}
      </div>

      <div className="bg-background hidden h-full w-14 flex-col space-y-4 p-2 xl:flex">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-full rounded-lg",
            activeTab === "chat" && "bg-secondary text-primary",
          )}
          onClick={() => !isLoading && handleTabChange("chat")}
          disabled={isLoading}
        >
          <MessageSquare className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-full rounded-lg",
            activeTab === "history" && "bg-secondary text-primary",
          )}
          onClick={() => !isLoading && handleTabChange("history")}
          disabled={isLoading}
        >
          <BookOpen className="size-5" />
        </Button>
        {authorized && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-full rounded-lg",
              activeTab === "github" && "bg-secondary text-primary",
            )}
            onClick={() => !isLoading && handleTabChange("github")}
            disabled={isLoading}
          >
            <Github className="size-5" />
          </Button>
        )}
        {authorized && selectedFramework !== Framework.HTML && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-full rounded-lg",
              activeTab === "integrations" && "bg-secondary text-primary",
            )}
            onClick={() => !isLoading && handleTabChange("integrations")}
            disabled={isLoading}
          >
            <Plug2 className="size-5" />
          </Button>
        )}
        {authorized && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-full rounded-lg",
              activeTab === "deployment" && "bg-secondary text-primary",
            )}
            onClick={() => !isLoading && handleTabChange("deployment")}
            disabled={isLoading}
          >
            <Rocket className="size-5" />
          </Button>
        )}
        {authorized && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-full rounded-lg",
              activeTab === "settings" && "bg-secondary text-primary",
            )}
            onClick={() => !isLoading && handleTabChange("settings")}
            disabled={isLoading}
          >
            <Settings className="size-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
