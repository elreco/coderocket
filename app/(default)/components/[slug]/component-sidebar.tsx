import {
  CircleFadingArrowUp,
  Loader,
  Loader2,
  Database,
  Paintbrush,
  RefreshCw,
  WandSparkles,
} from "lucide-react";
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  Fragment,
} from "react";

import { getSubscription } from "@/app/supabase-server";
import { CloneAnotherPageButton } from "@/components/clone-another-page-button";
import { CloneStatusCard } from "@/components/clone-status-card";
import { FigmaImportButton } from "@/components/figma-import-button";
import { FileBadge } from "@/components/file-badge";
import { ImageUploadArea } from "@/components/image-upload-area";
import { SelectedElementDisplay } from "@/components/selected-element-display";
import { TextareaWithLimit } from "@/components/textarea-with-limit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  ChatFile,
  extractFilesFromCompletion,
  createContinuePrompt,
  categorizeFiles,
} from "@/utils/completion-parser";
import {
  Framework,
  FREE_CHAR_LIMIT,
  maxImagesUpload,
  storageUrl,
} from "@/utils/config";
import { isSameDomain } from "@/utils/domain-helper";
import { validateFile } from "@/utils/file-helper";

import ComponentTheme from "./(settings)/component-theme";
import DeploymentContent from "./(settings)/deployment-content";
import GithubSync from "./(settings)/github-sync";
import IntegrationsContent from "./(settings)/integrations-content";
import SettingsContent from "./(settings)/settings-content";
import { improvePromptByChatId } from "./actions";
import ComponentChatFiles from "./component-chat-files";
import { ComponentSidebarSkeleton } from "./component-sidebar-skeleton";
import {
  HistoryTab,
  SidebarTabsDesktop,
  SidebarTabsMobile,
  TabHeader,
} from "./components";
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
    isScrapingWebsite,
    setIsScrapingWebsite,
    setIsContinuingFromLengthError,
    isStreamingComplete,
    connectedUser,
    selectedElement,
    clearSelectedElement,
    pendingClonePage,
    setPendingClonePage,
  } = useComponentContext();
  const { buildError, loadingState } = useBuilder();

  const [isLoaderVisible, setLoaderVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentVersionRef = useRef<HTMLDivElement | null>(null);
  const [hasImproved, setHasImproved] = useState(false);
  const [isImprovingLoading, setIsImprovingLoading] = useState(false);
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
  const isLoggedIn = !!connectedUser?.id;
  const [inputIsValid, setInputIsValid] = useState(true);
  const [localInput, setLocalInput] = useState(input);

  useEffect(() => {
    setLocalInput(input);
  }, [input]);
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

  const currentMessageFiles = useMemo(() => {
    if (!selectedAssistantMessage?.content) return [];
    return extractFilesFromCompletion(selectedAssistantMessage.content);
  }, [selectedAssistantMessage?.content]);

  const hasUnexecutedMigration = useMemo(() => {
    if (currentMessageFiles.length === 0) return false;
    const categorized = categorizeFiles(currentMessageFiles);
    return categorized.migrations.some((migration: ChatFile) => {
      const migrationsExecuted =
        selectedAssistantMessage?.migrations_executed as Array<{
          name: string;
          executed_at: string;
        }> | null;
      const isExecuted = (migrationsExecuted || []).some(
        (m) => m.name === migration.name,
      );
      return !isExecuted;
    });
  }, [currentMessageFiles, selectedAssistantMessage?.migrations_executed]);
  const [subscription, setSubscription] = useState<
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null
  >(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [isCloneAnotherPageActive, setIsCloneAnotherPageActive] =
    useState(false);
  const [currentCloneUrl, setCurrentCloneUrl] = useState<string | null>(null);
  const [showUrlInPromptModal, setShowUrlInPromptModal] = useState(false);
  const [pendingPromptWithUrl, setPendingPromptWithUrl] = useState<
    string | null
  >(null);

  const containsUrl = (text: string): boolean => {
    const urlPattern =
      /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    return urlPattern.test(text);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaderVisible(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoadingSubscription(true);

        if (connectedUser?.id) {
          const sub = await getSubscription(connectedUser.id);
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
  }, [connectedUser?.id]);

  const submitPrompt = (promptText: string) => {
    setInput(promptText);
    handleSubmitToAI(promptText);
    setActiveTab("chat");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!localInput.trim()) {
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

    if (fetchedChat?.clone_url && containsUrl(localInput)) {
      setPendingPromptWithUrl(localInput);
      setShowUrlInPromptModal(true);
      return;
    }

    submitPrompt(localInput);
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
    if (!localInput) {
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
      const improvedPrompt = await improvePromptByChatId(chatId, localInput);
      setLocalInput(improvedPrompt);
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

  // Le parsing du contenu en streaming est maintenant géré par ComponentChatFiles
  // Plus besoin de maintenir streamingChunks et chatFiles séparément

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
    return null;
  }, [setIsScrapingWebsite]);

  useEffect(() => {
    if (isScrapingWebsite && fetchedChat?.clone_url) {
      startScrapeSimulation();
    }
  }, [
    isScrapingWebsite,
    fetchedChat?.clone_url,
    startScrapeSimulation,
    setIsScrapingWebsite,
  ]);

  const hasDeactivatedScraping = useRef(false);
  useEffect(() => {
    if (
      isScrapingWebsite &&
      completion &&
      completion.length > 0 &&
      !hasDeactivatedScraping.current
    ) {
      hasDeactivatedScraping.current = true;
      setIsScrapingWebsite(false);
    }
    if (!isLoading) {
      hasDeactivatedScraping.current = false;
    }
  }, [isLoading, isScrapingWebsite, setIsScrapingWebsite, completion]);

  useEffect(() => {
    if (!isLoading && isCloneAnotherPageActive) {
      setIsCloneAnotherPageActive(false);
      setCurrentCloneUrl(null);
    }
  }, [isLoading, isCloneAnotherPageActive]);

  return (
    <>
      <div
        className={cn(
          "bg-secondary relative flex size-full flex-col overflow-hidden border-l-0 xl:flex-row xl:border-l",
          className,
        )}
      >
        <SidebarTabsMobile
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isLoading={isLoading}
          authorized={authorized}
          selectedFramework={selectedFramework}
        />

        <div className="bg-background flex flex-1 flex-col overflow-hidden">
          <TabHeader
            activeTab={activeTab}
            authorized={authorized}
            selectedFramework={selectedFramework}
          />

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
            {activeTab === "chat" && (
              <>
                {messages
                  .filter((m) => {
                    // Filtrer strictement par version - selectedVersion peut être 0, donc on doit vérifier explicitement
                    if (
                      selectedVersion === undefined ||
                      selectedVersion === null
                    )
                      return false;
                    // S'assurer que les types correspondent (number vs number)
                    const messageVersion = Number(m.version);
                    const currentSelectedVersion = Number(selectedVersion);
                    if (messageVersion !== currentSelectedVersion) return false;
                    // Ne pas afficher le message clone another page si on affiche déjà le loader temporaire
                    if (
                      isCloneAnotherPageActive &&
                      isScrapingWebsite &&
                      m.role === "user"
                    ) {
                      return false;
                    }
                    // Ne plus filtrer les messages assistant pendant le chargement
                    // On va créer un message temporaire pour le streaming
                    return true;
                  })
                  .map((m, index, filteredMessages) => {
                    const filteredUserMessages = filteredMessages.filter(
                      (msg) => msg.role === "user",
                    );
                    const isLastUserMessage =
                      filteredUserMessages.length > 0 &&
                      m.id ===
                        filteredUserMessages[filteredUserMessages.length - 1]
                          .id;
                    // Utiliser le streaming seulement si on est en cours de chargement ET qu'on n'a pas terminé
                    const shouldUseStreaming =
                      m.role === "assistant" &&
                      Number(m.version) === Number(selectedVersion) &&
                      isLoading &&
                      !isStreamingComplete &&
                      completion &&
                      completion.length > 0;

                    if (shouldUseStreaming) {
                      // Créer un message temporaire avec le contenu en streaming
                      // Ne pas inclure le screenshot et les tokens de l'ancien message pendant le streaming
                      const streamingMessage = {
                        ...m,
                        content: completion,
                        screenshot: null,
                        input_tokens: null,
                        output_tokens: null,
                        version: selectedVersion ?? m.version,
                      };
                      return (
                        <ComponentChatFiles
                          message={streamingMessage}
                          key={`streaming-${m.id}`}
                        />
                      );
                    }

                    // Ne pas afficher les messages assistant d'une autre version pendant le streaming
                    if (
                      m.role === "assistant" &&
                      Number(m.version) !== Number(selectedVersion) &&
                      isLoading &&
                      completion &&
                      completion.length > 0
                    ) {
                      return null;
                    }

                    // Ne pas afficher le message assistant pendant le scraping si on n'a pas encore de completion
                    // Cela évite d'afficher l'ancien contenu pendant le scraping
                    if (
                      m.role === "assistant" &&
                      isScrapingWebsite &&
                      (!completion || completion.length === 0)
                    ) {
                      return null;
                    }

                    const result = (
                      <ComponentChatFiles message={m} key={m.id} />
                    );

                    const isInitialCloneMessage =
                      fetchedChat?.clone_url &&
                      (m.version === -1 || m.version === 0) &&
                      m.role === "user";

                    const isCloneAnotherPageMessage =
                      m.role === "user" && !!m.clone_another_page;

                    const isPendingCloneMessage =
                      m.role === "user" &&
                      pendingClonePage !== null &&
                      isLoading &&
                      !m.clone_another_page &&
                      (isLastUserMessage ||
                        (pendingClonePage.context !== undefined &&
                          m.content?.trim() ===
                            pendingClonePage.context.trim()));

                    const cloneAnotherPageUrl = isCloneAnotherPageMessage
                      ? m.clone_another_page || null
                      : isPendingCloneMessage
                        ? pendingClonePage?.url || null
                        : null;
                    const cloneAnotherPageContext = isCloneAnotherPageMessage
                      ? m.content?.trim() || null
                      : isPendingCloneMessage
                        ? pendingClonePage?.context || null
                        : null;

                    const isCloneMessage =
                      isInitialCloneMessage ||
                      isCloneAnotherPageMessage ||
                      isPendingCloneMessage;

                    if (
                      isCloneMessage &&
                      isScrapingWebsite &&
                      (!completion || completion.length === 0)
                    ) {
                      const cloneUrl =
                        isCloneAnotherPageMessage || isPendingCloneMessage
                          ? cloneAnotherPageUrl
                          : currentCloneUrl || fetchedChat?.clone_url;
                      const userContext =
                        isCloneAnotherPageMessage || isPendingCloneMessage
                          ? cloneAnotherPageContext
                          : m.content;
                      return (
                        <Fragment key={`clone-loader-${m.id}`}>
                          <ComponentChatFiles
                            message={{
                              ...m,
                              content: "",
                            }}
                            customContent={
                              <CloneStatusCard
                                url={cloneUrl || ""}
                                isScraping={true}
                                userContext={userContext}
                              />
                            }
                          />
                          <div className="flex items-center justify-center py-4 px-3">
                            <p className="text-amber-600 text-xs font-medium text-center">
                              This process can take up to 1 minute. Please stay
                              on this page and do not close your browser.
                            </p>
                          </div>
                        </Fragment>
                      );
                    }

                    if (isCloneMessage && !isScrapingWebsite) {
                      const cloneUrl =
                        isCloneAnotherPageMessage || isPendingCloneMessage
                          ? cloneAnotherPageUrl
                          : fetchedChat?.clone_url;
                      const userContext =
                        isCloneAnotherPageMessage || isPendingCloneMessage
                          ? cloneAnotherPageContext
                          : m.content;
                      return (
                        <ComponentChatFiles
                          key={m.id}
                          message={{
                            ...m,
                            content: "",
                          }}
                          customContent={
                            <CloneStatusCard
                              url={cloneUrl || ""}
                              isScraping={false}
                              userContext={userContext}
                            />
                          }
                        />
                      );
                    }

                    if (
                      m.role === "user" &&
                      !isCloneMessage &&
                      isLoading &&
                      (!completion || completion.length === 0)
                    ) {
                      return (
                        <Fragment key={`loader-${m.id}`}>
                          {result}
                          <div className="flex items-center justify-center py-8 px-3">
                            <div className="flex flex-col items-center gap-3">
                              <Loader className="text-primary size-6 animate-spin" />
                              <p className="text-primary text-sm font-medium">
                                Generating component...
                              </p>
                            </div>
                          </div>
                        </Fragment>
                      );
                    }

                    return result;
                  })}
                {/* Afficher un message temporaire si on génère mais qu'il n'y a pas encore de message assistant */}
                {isLoading &&
                  completion &&
                  completion.length > 0 &&
                  !messages.some(
                    (m) =>
                      m.role === "assistant" &&
                      Number(m.version) === Number(selectedVersion),
                  ) && (
                    <ComponentChatFiles
                      message={
                        {
                          id: 0,
                          chat_id: chatId,
                          version: selectedVersion || -1,
                          role: "assistant",
                          content: completion,
                          created_at: new Date().toISOString(),
                          input_tokens: null,
                          output_tokens: null,
                          screenshot: null,
                          theme: null,
                          artifact_code: null,
                          build_error: null,
                          selected_element: null,
                          prompt_image: null,
                          files: null,
                          subscription_type: null,
                          cache_creation_input_tokens: null,
                          cache_read_input_tokens: null,
                          cost_usd: null,
                          model_used: null,
                          migrations_executed: null,
                          clone_another_page: null,
                          is_built: false,
                          is_github_pull: false,
                          migration_executed_at: null,
                          chats: {
                            user: user as Tables<"users">,
                            prompt_image: null,
                          },
                        } as Tables<"messages"> & {
                          chats: {
                            user: Tables<"users">;
                            prompt_image: string | null;
                          };
                        }
                      }
                      key="streaming-temp"
                    />
                  )}
                {isCloneAnotherPageActive &&
                  isScrapingWebsite &&
                  (!completion || completion.length === 0) &&
                  currentCloneUrl && (
                    <Fragment key="clone-another-page-loader">
                      <ComponentChatFiles
                        message={
                          {
                            id: -999,
                            chat_id: chatId,
                            version: selectedVersion || -1,
                            role: "user",
                            content: "",
                            created_at: new Date().toISOString(),
                            input_tokens: null,
                            output_tokens: null,
                            screenshot: null,
                            theme: null,
                            artifact_code: null,
                            build_error: null,
                            selected_element: null,
                            prompt_image: null,
                            files: null,
                            subscription_type: null,
                            cache_creation_input_tokens: null,
                            cache_read_input_tokens: null,
                            cost_usd: null,
                            model_used: null,
                            migrations_executed: null,
                            clone_another_page: currentCloneUrl,
                            is_built: false,
                            is_github_pull: false,
                            migration_executed_at: null,
                            chats: {
                              user: user as Tables<"users">,
                              prompt_image: null,
                            },
                          } as Tables<"messages"> & {
                            chats: {
                              user: Tables<"users">;
                              prompt_image: string | null;
                            };
                          }
                        }
                        customContent={
                          <CloneStatusCard
                            url={currentCloneUrl}
                            isScraping={true}
                            userContext={pendingClonePage?.context || null}
                          />
                        }
                      />
                      <div className="flex items-center justify-center py-4 px-3">
                        <p className="text-amber-600 text-xs font-medium text-center">
                          This process can take up to 1 minute. Please stay on
                          this page and do not close your browser.
                        </p>
                      </div>
                    </Fragment>
                  )}
              </>
            )}
            {activeTab === "history" && (
              <HistoryTab
                messages={messages}
                selectedVersion={selectedVersion}
                isLoading={isLoading}
                user={user}
                currentVersionRef={currentVersionRef}
                onVersionSelect={handleFileClick}
              />
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
                  !messages.some(
                    (m) =>
                      m.role === "user" &&
                      Number(m.version) === Number(selectedVersion),
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
                {selectedElement && (
                  <SelectedElementDisplay element={selectedElement} />
                )}
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
                {/* Le contenu du chat est maintenant géré dans la section activeTab === "chat" */}
              </div>
              {/* Le loader de typing est maintenant géré par ComponentChatFiles */}
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                className="mr-2"
                                onClick={() => {
                                  setIsContinuingFromLengthError(true);
                                  const continuePrompt =
                                    createContinuePrompt(messages);
                                  setInput(continuePrompt);
                                  submitPrompt(continuePrompt);
                                }}
                              >
                                <RefreshCw className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Continue generation</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!isLoading && loadingState === "error" && buildError && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                className="mr-2"
                                onClick={() => {
                                  const errorContent =
                                    buildError.errors?.join("\n\n") || "";
                                  const truncatedContent =
                                    errorContent.length > FREE_CHAR_LIMIT
                                      ? errorContent.substring(
                                          0,
                                          FREE_CHAR_LIMIT,
                                        )
                                      : errorContent;
                                  const continuePrompt =
                                    "Fix the following error: " +
                                    truncatedContent;
                                  setInput(continuePrompt);
                                  handleSubmitToAI(continuePrompt);
                                }}
                              >
                                <WandSparkles className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Fix errors</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!isLoading && hasUnexecutedMigration && authorized && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                className="mr-2"
                                onClick={() => {
                                  const migrationSection =
                                    document.querySelector(
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
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Run Migration</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedFramework === Framework.HTML &&
                        !isLengthError && (
                          <div className="text-sm font-semibold">
                            <ComponentTheme>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="flex items-center"
                                      disabled={isLoading}
                                    >
                                      <Paintbrush className="size-4 shrink-0" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Theme</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
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
                                files.length >= maxImagesUpload ||
                                loadingState === "processing"
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
                              subscription={subscription}
                              isLoggedIn={isLoggedIn}
                              currentFilesCount={files.length}
                              onFileSelectFromLibrary={async (libraryFile) => {
                                try {
                                  const response = await fetch(
                                    libraryFile.publicUrl,
                                  );
                                  const blob = await response.blob();
                                  const fileName = libraryFile.name;
                                  const file = new File([blob], fileName, {
                                    type: libraryFile.mimeType,
                                  });
                                  (
                                    file as File & { __libraryPath?: string }
                                  ).__libraryPath = libraryFile.path;

                                  if (files.length >= maxImagesUpload) {
                                    toast({
                                      variant: "destructive",
                                      title: "Too many files",
                                      description: `Maximum ${maxImagesUpload} files allowed`,
                                      duration: 4000,
                                    });
                                    return;
                                  }

                                  const validation = validateFile(file);
                                  if (!validation.valid) {
                                    toast({
                                      variant: "destructive",
                                      title: "Invalid file",
                                      description: validation.error,
                                      duration: 4000,
                                    });
                                    return;
                                  }

                                  setFiles((prev) => [...prev, file]);
                                } catch (error) {
                                  console.error(
                                    "Error loading file from library:",
                                    error,
                                  );
                                  toast({
                                    variant: "destructive",
                                    title: "Error loading file",
                                    description:
                                      "Failed to load file from library",
                                    duration: 4000,
                                  });
                                }
                              }}
                              onFileDeleted={(deletedPath) => {
                                setFiles((prev) =>
                                  prev.filter(
                                    (file) =>
                                      (
                                        file as File & {
                                          __libraryPath?: string;
                                        }
                                      ).__libraryPath !== deletedPath,
                                  ),
                                );
                              }}
                              onFileUpload={(uploadedFiles) => {
                                const validFiles: File[] = [];

                                for (const file of uploadedFiles) {
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
                            />
                            <FigmaImportButton
                              disabled={
                                isLoading ||
                                isLengthError ||
                                !!buildError ||
                                loadingState === "processing"
                              }
                              framework={selectedFramework}
                              subscription={subscription}
                              isLoggedIn={isLoggedIn}
                              onFileImport={(file) => {
                                setFiles((prev) => [...prev, file]);
                              }}
                            />
                            {fetchedChat?.clone_url && (
                              <CloneAnotherPageButton
                                originalUrl={fetchedChat.clone_url}
                                disabled={
                                  isLoading ||
                                  isLengthError ||
                                  !!buildError ||
                                  loadingState === "processing"
                                }
                                subscription={subscription}
                                isLoggedIn={isLoggedIn}
                                isLoadingSubscription={isLoadingSubscription}
                                onSubmit={(url, context) => {
                                  setPendingClonePage({ url, context });
                                  setIsCloneAnotherPageActive(true);
                                  setCurrentCloneUrl(url);
                                  setIsScrapingWebsite(true);
                                  const displayPrompt = context || "";
                                  setInput(displayPrompt);
                                  submitPrompt(displayPrompt);
                                }}
                              />
                            )}
                          </>
                        )}
                    </div>
                  </div>
                  {!isLoading && files.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto p-2">
                      {files.map((file, index) => (
                        <FileBadge
                          key={`${file.name}-${index}`}
                          file={file}
                          onRemove={() => handleFileRemove(index)}
                          disabled={isLengthError || !!buildError}
                        />
                      ))}
                    </div>
                  )}
                  {selectedElement && !isLoading && (
                    <div className="m-2">
                      <SelectedElementDisplay
                        element={selectedElement}
                        showClearButton={true}
                        onClear={clearSelectedElement}
                      />
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
                      value={localInput}
                      onChange={(value, isValid) => {
                        setLocalInput(value);
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
                        localInput.length <= 3 && "opacity-0",
                      )}
                    >
                      Use{" "}
                      <kbd className="bg-secondary rounded-md p-1">Shift</kbd> +{" "}
                      <kbd className="bg-secondary rounded-md p-1">Return</kbd>{" "}
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

        <SidebarTabsDesktop
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isLoading={isLoading}
          authorized={authorized}
          selectedFramework={selectedFramework}
        />
      </div>

      <Dialog
        open={showUrlInPromptModal}
        onOpenChange={(open) => {
          if (!isLoading && !open) {
            setShowUrlInPromptModal(false);
            setPendingPromptWithUrl(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>URL detected in prompt</DialogTitle>
            <DialogDescription>
              An URL was detected in your prompt. You can clone another page
              from the same website or continue with a normal modification.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowUrlInPromptModal(false);
                setPendingPromptWithUrl(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (!pendingPromptWithUrl) {
                  setShowUrlInPromptModal(false);
                  return;
                }
                const urlMatch = pendingPromptWithUrl.match(
                  /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/i,
                );
                if (!urlMatch) {
                  setShowUrlInPromptModal(false);
                  setPendingPromptWithUrl(null);
                  return;
                }
                let url = urlMatch[0];
                if (!/^https?:\/\//i.test(url)) {
                  url = "https://" + url;
                }
                if (
                  fetchedChat?.clone_url &&
                  !isSameDomain(fetchedChat.clone_url, url)
                ) {
                  toast({
                    variant: "destructive",
                    title: "Different domain",
                    description:
                      "You can only clone pages from the same domain as the original website.",
                    duration: 4000,
                  });
                  setShowUrlInPromptModal(false);
                  setPendingPromptWithUrl(null);
                  return;
                }
                setPendingClonePage({ url });
                setIsCloneAnotherPageActive(true);
                setCurrentCloneUrl(url);
                setIsScrapingWebsite(true);
                setShowUrlInPromptModal(false);
                setPendingPromptWithUrl(null);
                setInput("");
                setLocalInput("");
                submitPrompt("");
              }}
              disabled={isLoading}
            >
              Use &quot;Clone another page&quot;
            </Button>
            <Button
              onClick={() => {
                const promptToUse = pendingPromptWithUrl || localInput;
                setShowUrlInPromptModal(false);
                setPendingPromptWithUrl(null);
                submitPrompt(promptToUse);
              }}
              disabled={isLoading}
            >
              Continue as normal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
