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
  Settings,
  Github,
  Plug2,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";

import { getSubscription } from "@/app/supabase-server";
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
import { useComponentContext } from "@/context/component-context";
import { useWebcontainer } from "@/context/webcontainer-context";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import { cloneWebsite } from "@/utils/actions/clone-website";
import {
  ChatFile,
  ContentChunk,
  extractDirectFiles,
  extractFilesFromCompletion,
  hasArtifacts,
  splitContentIntoChunks,
  createContinuePrompt,
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
    files,
    setFiles,
    defaultFiles,
    isLengthError,
    fetchedChat,
  } = useComponentContext();
  const { buildError } = useWebcontainer();

  const [isLoaderVisible, setLoaderVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentVersionRef = useRef<HTMLDivElement | null>(null);
  const [streamingChunks, setStreamingChunks] = useState<ContentChunk[]>([]);
  const { sidebarTab: activeTab, setSidebarTab: setActiveTab } =
    useComponentContext();
  const [hasImproved, setHasImproved] = useState(false);
  const [isImprovingLoading, setIsImprovingLoading] = useState(false);
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
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
  const [scrapingStatus, setScrapingStatus] = useState<{
    progress: number;
    images: Array<{ url: string; alt: string }>;
    colors: string[];
    fonts: string[];
    structure: { sections: number; imageCount: number };
    screenshot?: string | null;
    videosCount: number;
    error?: string | null;
    markdown?: string;
    html?: string;
  }>({
    progress: 0,
    images: [],
    colors: [],
    fonts: [],
    structure: { sections: 0, imageCount: 0 },
    screenshot: null,
    videosCount: 0,
    error: null,
    markdown: undefined,
    html: undefined,
  });

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
        // Pour les chunks de type "text", vérifier s'ils ne contiennent pas de balises coderocketFile
        return !chunk.content.includes("<coderocketFile");
      });

      // Mettre à jour les états ensemble pour éviter les sauts
      setStreamingChunks(newChunks);
      setChatFiles(extractedFiles);
    } else if (!isLoading && !isLengthError && !buildError) {
      // Réinitialiser les états lorsque le chargement est terminé
      setStreamingChunks([]);
      setChatFiles([]);
    }
  }, [completion, isLoading, isLengthError, buildError]);

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
  }, [inputRef, toast, files.length, setFiles]);

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

  const fetchCloneData = useCallback(async (url: string) => {
    if (!url) return false;

    let progressInterval: NodeJS.Timeout | null = null;
    let currentProgress = 0;

    try {
      setScrapingStatus((prev) => ({ ...prev, progress: 5 }));
      currentProgress = 5;

      progressInterval = setInterval(() => {
        currentProgress += Math.random() * 8 + 2;
        if (currentProgress > 85) currentProgress = 85;
        setScrapingStatus((prev) => ({ ...prev, progress: currentProgress }));
      }, 1200);

      const result = await cloneWebsite(url);

      if (progressInterval) clearInterval(progressInterval);

      if (result.success && result.data) {
        console.log("Clone data received:", {
          hasScreenshot: !!result.data.screenshot,
          screenshotType: typeof result.data.screenshot,
          screenshotLength: result.data.screenshot?.length,
          hasMarkdown: !!result.data.markdown,
          hasHtml: !!result.data.html,
        });

        const finalSteps = [90, 95, 100];
        for (let i = 0; i < finalSteps.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          setScrapingStatus((prev) => ({
            ...prev,
            progress: finalSteps[i],
            screenshot:
              i === finalSteps.length - 1
                ? result.data.screenshot || null
                : prev.screenshot,
          }));
        }

        setScrapingStatus({
          progress: 100,
          images: [],
          colors: [],
          fonts: [],
          structure: {
            sections: 0,
            imageCount: 0,
          },
          screenshot: result.data.screenshot || null,
          videosCount: 0,
          error: null,
          markdown: result.data.markdown,
          html: result.data.html,
        });

        return true;
      } else if (!result.success) {
        setScrapingStatus((prev) => ({
          ...prev,
          error: result.error || "Failed to analyze website",
          progress: 95,
        }));
        return false;
      }
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error("Error fetching clone data:", error);
      setScrapingStatus((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        progress: 95,
      }));
    }

    return false;
  }, []);

  useEffect(() => {
    // Only run this effect when in clone mode with a URL
    if (fetchedChat?.clone_url && selectedVersion === -1 && isLoading) {
      // Try to fetch real data first
      let intervalId: NodeJS.Timeout;
      let hasRealData = false;

      const fetchData = async () => {
        if (fetchedChat.clone_url) {
          hasRealData = await fetchCloneData(fetchedChat.clone_url);
        }

        // If we couldn't get real data, simulate progress
        if (!hasRealData) {
          intervalId = setInterval(() => {
            setScrapingStatus((prev) => {
              // Smooth incremental progress (2-5% per tick)
              const progressIncrement = Math.floor(Math.random() * 4) + 2;
              const newProgress = Math.min(
                prev.progress + progressIncrement,
                95,
              );

              // Simulate discovering images and colors as progress increases
              const newImages = [...prev.images];
              const newColors = [...prev.colors];
              const newFonts = [...prev.fonts];
              const newStructure = { ...prev.structure };

              // Add simulated images at certain progress points
              if (newProgress > 30 && prev.progress <= 30) {
                const imageCount = Math.floor(Math.random() * 3) + 1;
                for (let i = 0; i < imageCount; i++) {
                  newImages.push({
                    url: `https://picsum.photos/seed/${Math.random()}/${200}/${150}`,
                    alt: `Found image ${newImages.length + 1}`,
                  });
                }
                newStructure.imageCount = newImages.length;
              }

              if (newProgress > 50 && prev.progress <= 50) {
                // Add some colors
                const colors = [
                  "#3B82F6",
                  "#10B981",
                  "#F59E0B",
                  "#EF4444",
                  "#8B5CF6",
                ];
                for (let i = 0; i < Math.min(3, colors.length); i++) {
                  if (!newColors.includes(colors[i])) {
                    newColors.push(colors[i]);
                  }
                }

                // Add some fonts
                const fonts = ["Inter", "Roboto", "Open Sans", "Montserrat"];
                for (let i = 0; i < Math.min(2, fonts.length); i++) {
                  if (!newFonts.includes(fonts[i])) {
                    newFonts.push(fonts[i]);
                  }
                }

                // Update sections count
                newStructure.sections = Math.floor(Math.random() * 5) + 3;
              }

              if (newProgress > 70 && prev.progress <= 70) {
                const imageCount = Math.floor(Math.random() * 4) + 2;
                for (let i = 0; i < imageCount; i++) {
                  newImages.push({
                    url: `https://picsum.photos/seed/${Math.random()}/${200}/${150}`,
                    alt: `Found image ${newImages.length + 1}`,
                  });
                }
                newStructure.imageCount = newImages.length;
              }

              return {
                progress: newProgress,
                images: newImages,
                colors: newColors,
                fonts: newFonts,
                structure: newStructure,
                videosCount:
                  newProgress > 60 ? Math.floor(Math.random() * 3) : 0,
                error: prev.error,
              };
            });
          }, 800);
        }
      };

      fetchData();

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [fetchedChat?.clone_url, selectedVersion, isLoading, fetchCloneData]);

  return (
    <div
      className={cn(
        "relative flex size-full flex-col overflow-hidden border-l-0 bg-secondary xl:border-l xl:flex-row",
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
                ? "grid-cols-4"
                : "grid-cols-5"
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
            <TabsTrigger value="settings" disabled={isLoading}>
              <Settings className="size-4" />
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {activeTab === "chat" && (
          <div className="flex h-12 items-center gap-2 bg-background px-4 py-1.5">
            <MessageSquare className="size-4" />
            <h3 className="text-base font-medium">Chat</h3>
          </div>
        )}
        {activeTab === "history" && (
          <div className="flex h-12 items-center gap-2 bg-background px-4 py-1.5">
            <BookOpen className="size-4" />
            <h3 className="text-base font-medium">History</h3>
          </div>
        )}
        {authorized && activeTab === "github" && (
          <div className="flex h-12 items-center gap-2 bg-background px-4 py-1.5">
            <Github className="size-4" />
            <h3 className="text-base font-medium">GitHub Sync</h3>
          </div>
        )}
        {authorized &&
          selectedFramework !== Framework.HTML &&
          activeTab === "integrations" && (
            <div className="flex h-12 items-center gap-2 bg-background px-4 py-1.5">
              <Plug2 className="size-4" />
              <h3 className="text-base font-medium">Integrations</h3>
            </div>
          )}
        {authorized && activeTab === "settings" && (
          <div className="flex h-12 items-center gap-2 bg-background px-4 py-1.5">
            <Settings className="size-4" />
            <h3 className="text-base font-medium">Settings</h3>
          </div>
        )}

        <div
          ref={containerRef}
          className={cn(
            "flex flex-1 flex-col overflow-y-auto overflow-x-hidden scroll-smooth border-r border-border bg-secondary",
            activeTab === "chat" && "rounded-r-lg border-y",
            activeTab !== "chat" && "rounded-tr-lg border-t",
          )}
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
                              "rounded-lg border border-primary/20 bg-primary/5 p-2 transition-all",
                              m.version === selectedVersion
                                ? "cursor-default border-primary/30"
                                : isLoading
                                  ? "cursor-not-allowed opacity-70"
                                  : "cursor-pointer hover:border-primary/30",
                            )}
                          >
                            <div className="flex w-full items-center justify-between gap-2 p-1">
                              <div className="flex w-full items-center gap-2">
                                <Avatar className="size-8 border border-primary">
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
                                  <span className="text-xs text-muted-foreground">
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
                            <p className="mt-2 text-right text-xs text-muted-foreground">
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
          {!isLoading && authorized && activeTab === "settings" && (
            <SettingsContent />
          )}
          <div
            className={cn(
              "flex flex-col px-2 py-6 sm:px-4",
              "transition-all duration-200",
              isLoading && input ? "block" : "hidden",
            )}
          >
            <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-2 transition-all">
              <UserWidget
                id={user?.id}
                createdAt={new Date().toISOString()}
                userAvatarUrl={user?.avatar_url}
                userFullName={user?.full_name}
              />
              <Markdown>{input}</Markdown>
              <PromptFiles fileUrls={defaultFiles} storageUrl={storageUrl} />
            </div>
          </div>
          <div
            className={cn(
              "flex flex-col px-2 py-6 sm:px-4",
              "transition-all duration-200",
              isLoading ? "block" : "hidden",
            )}
          >
            <div className="flex w-full flex-col gap-2 overflow-x-auto break-words text-sm">
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
              {fetchedChat?.clone_url && selectedVersion === -1 && (
                <div className="mb-4 mt-2 flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">
                  <div className="flex items-center">
                    {completion ? (
                      <CheckCircle className="mr-2 size-5 text-green-500" />
                    ) : (
                      <Loader className="mr-2 size-5 animate-spin text-primary" />
                    )}
                    {completion ? (
                      <p className="font-medium text-green-600">
                        Website {fetchedChat.clone_url} analyzed
                      </p>
                    ) : (
                      <p className="font-medium text-primary">
                        Scraping {fetchedChat.clone_url}
                      </p>
                    )}
                  </div>
                  {!completion ? (
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
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/10">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 ease-out"
                          style={{ width: `${scrapingStatus.progress}%` }}
                        >
                          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
                          const isActive =
                            scrapingStatus.progress >= step.progress &&
                            scrapingStatus.progress <
                              ([20, 40, 60, 80, 95, 100][index] || 100);
                          const isCompleted =
                            scrapingStatus.progress >
                            ([20, 40, 60, 80, 95, 100][index] || 100);

                          return (
                            <div
                              key={step.label}
                              className={cn(
                                "flex items-start gap-3 rounded-lg border p-2.5 transition-all duration-300",
                                isActive &&
                                  "border-primary/40 bg-primary/5 shadow-sm",
                                isCompleted &&
                                  "border-primary/20 bg-primary/5 opacity-60",
                                !isActive &&
                                  !isCompleted &&
                                  "border-transparent bg-muted/30 opacity-40",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex size-7 shrink-0 items-center justify-center rounded-full text-sm transition-all",
                                  isActive && "animate-pulse bg-primary/20",
                                  isCompleted && "bg-primary/10",
                                  !isActive && !isCompleted && "bg-muted/50",
                                )}
                              >
                                {isCompleted ? (
                                  <svg
                                    className="size-4 text-primary"
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
                    <div className="mt-4 overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                        <svg
                          className="size-4 text-primary"
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
                      <div className="max-h-[250px] overflow-y-auto rounded-md border border-border">
                        <img
                          src={
                            scrapingStatus.screenshot.startsWith("http")
                              ? scrapingStatus.screenshot
                              : `data:image/jpeg;base64,${scrapingStatus.screenshot}`
                          }
                          alt="Website screenshot"
                          className="w-full object-cover"
                          onError={() => {
                            console.error("Screenshot load error");
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <ChunkReader
                chunks={streamingChunks}
                files={chatFiles}
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
        {activeTab === "chat" && (
          <form
            className="flex w-full items-center"
            onSubmit={(e) => handleSubmit(e)}
          >
            {authorized && (
              <div className="flex w-full flex-col bg-background">
                <div className="flex w-full items-center justify-between space-x-1 px-2 pt-2">
                  <div className="flex items-center gap-2">
                    {/* Continue your work button */}
                    {!isLoading && isLengthError && (
                      <Button
                        type="button"
                        size="sm"
                        className="mr-2"
                        onClick={() => {
                          const continuePrompt = createContinuePrompt(messages);
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
                      isUploading={isLoading && files.length > 0}
                      label="Files"
                    />
                  </div>
                </div>
                {files.length > 0 && (
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
                    disabled={isLoading || isLengthError}
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
                    Use <kbd className="rounded-sm bg-secondary p-1">Shift</kbd>{" "}
                    + <kbd className="rounded-sm bg-secondary p-1">Return</kbd>{" "}
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
        )}
      </div>

      <div className="hidden h-full w-14 flex-col space-y-4 bg-background p-2 xl:flex">
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
