"use client";

import { useCompletion } from "@ai-sdk/react";
import { SiThreads } from "@icons-pack/react-simple-icons";
import { format } from "date-fns";
import {
  Fullscreen,
  Layers,
  Loader,
  ExternalLink,
  RefreshCw,
  Copy,
  GitFork,
  Eye,
  Code as CodeIcon,
  Heart,
  Info,
  Share,
  Rocket,
  Monitor,
  Tablet,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  Crosshair,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef, FormEvent } from "react";
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  RedditShareButton,
  TelegramShareButton,
  WhatsappShareButton,
  EmailShareButton,
  FacebookIcon,
  XIcon,
  LinkedinIcon,
  RedditIcon,
  TelegramIcon,
  WhatsappIcon,
  EmailIcon,
} from "react-share";
import { useCopyToClipboard } from "usehooks-ts";

import { getSubscription } from "@/app/supabase-server";
import { ClonedUrlBadge } from "@/components/cloned-url-badge";
import { Container } from "@/components/container";
import { RemixOriginalBadge } from "@/components/remix-original-badge";
import RenderHtmlComponent from "@/components/renders/render-html-component";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BuilderProvider } from "@/context/builder-context";
import {
  ChatMessage,
  ComponentContext,
  WebcontainerLoadingState,
  BreakpointType,
  SelectedElementData,
} from "@/context/component-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CustomDomainData } from "@/types/custom-domain";
import { Tables } from "@/types_db";
import {
  ChatFile,
  extractFilesFromArtifact,
  extractFilesFromCompletion,
  getUpdatedArtifactCode,
} from "@/utils/completion-parser";
import { Framework } from "@/utils/config";
import { defaultArtifactCode } from "@/utils/default-artifact-code";
import { ROCKET_LIMITS_PER_PLAN } from "@/utils/rocket-conversion";
import { getArtifactCodeByVersion } from "@/utils/supabase/artifact-helpers";
import { createClient } from "@/utils/supabase/client";

import {
  fetchChatById,
  fetchChatDataOptimized,
  fetchLastAssistantMessageByChatId,
  fetchMessagesByChatId,
  toggleChatLike,
  remixChat,
} from "../actions";

import CodePreview from "./code-preview";
import ComponentSidebar from "./component-sidebar";

interface Props {
  chatId: string;
  authorized: boolean;
  user: Tables<"users"> | null;
  connectedUser?: { id: string } | null;
}

export default function ComponentCompletion({
  chatId,
  authorized,
  user,
  connectedUser,
}: Props) {
  const supabase = createClient();
  const [customDomain, setCustomDomain] = useState<CustomDomainData | null>(
    null,
  );
  const [githubConnection, setGithubConnection] =
    useState<Tables<"github_connections"> | null>(null);
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  const router = useRouter();
  const { setOpen: setSidebarOpen } = useSidebar();
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(
    undefined,
  );
  const selectedVersionRef = useRef<number | undefined>(undefined);
  const [title, setTitle] = useState<string>("");
  const [isCanvas, setCanvas] = useState(true);
  const [isVisible, setVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editorValue, setEditorValue] = useState("");
  const [isWebcontainerReady, setWebcontainerReady] = useState(false);
  const [loadingState, setLoadingState] =
    useState<WebcontainerLoadingState>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [breakpoint, setBreakpoint] = useState<BreakpointType>("desktop");
  const [previewPath, setPreviewPath] = useState("/");
  const previousChatIdRef = useRef<string | null>(null);
  const previousFrameworkRef = useRef<Framework | null>(null);
  const ignoreNextRootRouteRef = useRef<boolean>(false);

  const [addressBarValue, setAddressBarValue] = useState("/");
  const [navigationHistory, setNavigationHistory] = useState<string[]>(["/"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const [addressFocused, setAddressFocused] = useState(false);
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);

  const normalizePreviewPath = useCallback((value: string) => {
    if (!value) {
      return "/";
    }
    let nextPath = value.trim();
    if (!nextPath.startsWith("/")) {
      nextPath = `/${nextPath}`;
    }
    if (nextPath.includes("?")) {
      nextPath = nextPath.split("?")[0];
    }
    const hashIndex = nextPath.indexOf("#");
    const hash = hashIndex !== -1 ? nextPath.substring(hashIndex) : "";
    if (hashIndex !== -1) {
      nextPath = nextPath.substring(0, hashIndex);
    }
    nextPath = nextPath.replace(/\/+/g, "/");
    if (nextPath.length > 1 && nextPath.endsWith("/")) {
      nextPath = nextPath.slice(0, -1);
    }
    return (nextPath || "/") + hash;
  }, []);

  const pushPathToHistory = useCallback(
    (normalizedPath: string, shouldPushHistory: boolean) => {
      if (!shouldPushHistory) {
        return;
      }
      setNavigationHistory((prev) => {
        const activeIndex = historyIndexRef.current;
        const trimmedHistory =
          activeIndex < prev.length - 1 ? prev.slice(0, activeIndex + 1) : prev;
        if (trimmedHistory[trimmedHistory.length - 1] === normalizedPath) {
          const currentIndex = trimmedHistory.length - 1;
          setHistoryIndex(currentIndex);
          historyIndexRef.current = currentIndex;
          return trimmedHistory;
        }
        const updatedHistory = [...trimmedHistory, normalizedPath];
        const newIndex = updatedHistory.length - 1;
        setHistoryIndex(newIndex);
        historyIndexRef.current = newIndex;
        return updatedHistory;
      });
    },
    [setNavigationHistory, setHistoryIndex],
  );

  const navigatePreview = useCallback(
    (targetPath: string, options?: { pushHistory?: boolean }) => {
      const normalizedPath = normalizePreviewPath(targetPath);
      setPreviewPath(normalizedPath);
      setAddressBarValue(normalizedPath);
      pushPathToHistory(normalizedPath, options?.pushHistory !== false);
    },
    [normalizePreviewPath, pushPathToHistory],
  );

  const syncPreviewPath = useCallback(
    (targetPath: string, options?: { pushHistory?: boolean }) => {
      const normalizedPath = normalizePreviewPath(targetPath);
      if (normalizedPath === "/" && ignoreNextRootRouteRef.current) {
        ignoreNextRootRouteRef.current = false;
        return;
      }
      ignoreNextRootRouteRef.current = false;
      setAddressBarValue(normalizedPath);
      pushPathToHistory(normalizedPath, options?.pushHistory !== false);
    },
    [normalizePreviewPath, pushPathToHistory],
  );

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const [artifactFiles, setArtifactFiles] = useState<ChatFile[]>([]);
  const [previousArtifactFiles, setPreviousArtifactFiles] = useState<
    ChatFile[]
  >([]);

  const [artifactCode, setArtifactCode] = useState("");

  const [activeTab, setActiveTab] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [forceBuild, setForceBuild] = useState(false);
  const [isLengthError, setIsLengthError] = useState(false);
  const [isContinuingFromLengthError, setIsContinuingFromLengthError] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fetchedChat, setFetchedChat] = useState<Tables<"chats"> | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] =
    useState<Tables<"messages"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const uploadFilesRef = useRef<File[]>([]);
  const [defaultImage, setDefaultImage] = useState<string | null>(null);
  const [defaultFiles, setDefaultFiles] = useState<string[]>([]);
  const [sidebarTab, setSidebarTab] = useState("chat");
  const hasInitiatedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    uploadFilesRef.current = uploadFiles;
  }, [uploadFiles]);

  useEffect(() => {
    setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [remixOriginalChat, setRemixOriginalChat] =
    useState<Tables<"chats"> | null>(null);

  const [isRemixing, setIsRemixing] = useState(false);
  const [subscription, setSubscription] =
    useState<Tables<"subscriptions"> | null>(null);

  const [isRemixModalOpen, setIsRemixModalOpen] = useState(false);
  const [hasAlreadyRemixed, setHasAlreadyRemixed] = useState(false);
  const [currentGeneratingFile, setCurrentGeneratingFile] = useState<
    string | null
  >(null);
  const isUserLoggedIn = !!connectedUser;
  const [isElementSelectionActive, setIsElementSelectionActive] =
    useState(false);
  const [selectedElement, setSelectedElement] =
    useState<SelectedElementData | null>(null);

  const setElementSelectionActive = useCallback((value: boolean) => {
    setIsElementSelectionActive(value);
  }, []);

  const clearSelectedElement = useCallback(() => {
    setSelectedElement(null);
  }, []);

  useEffect(() => {
    if (addressBarValue !== "/") {
      ignoreNextRootRouteRef.current = true;
      setPreviewPath(addressBarValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion]);

  useEffect(() => {
    const isChatIdChange =
      previousChatIdRef.current !== null &&
      previousChatIdRef.current !== chatId;
    const isFrameworkChange =
      previousFrameworkRef.current !== null &&
      previousFrameworkRef.current !== (fetchedChat?.framework as Framework);
    const isFirstLoad = previousChatIdRef.current === null;

    if (isChatIdChange || isFrameworkChange || isFirstLoad) {
      setPreviewPath("/");
      setAddressBarValue("/");
      setNavigationHistory(["/"]);
      setHistoryIndex(0);
      historyIndexRef.current = 0;
    }

    previousChatIdRef.current = chatId;
    previousFrameworkRef.current =
      (fetchedChat?.framework as Framework) || null;
  }, [chatId, fetchedChat?.framework]);

  const isHtmlFrameworkSelected = fetchedChat?.framework === Framework.HTML;
  const previewPathSuffix = previewPath === "/" ? "" : previewPath;
  const sharePathSuffix = addressBarValue === "/" ? "" : addressBarValue;
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < navigationHistory.length - 1;
  const canUseSpaNavigation =
    !isHtmlFrameworkSelected &&
    isWebcontainerReady &&
    selectedVersion !== undefined &&
    !isLoading;
  const canUseHtmlNavigation =
    isHtmlFrameworkSelected && artifactFiles.length > 0 && !isLengthError;
  const isNavigationEnabled = canUseSpaNavigation || canUseHtmlNavigation;
  const navigationPlaceholder = isHtmlFrameworkSelected ? "/index.html" : "/";

  const handleAddressSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isNavigationEnabled) {
      return;
    }
    navigatePreview(addressBarValue);
    addressInputRef.current?.blur();
  };

  const handleGoBack = () => {
    if (!canGoBack) {
      return;
    }
    const newIndex = historyIndex - 1;
    const targetPath = navigationHistory[newIndex] || "/";
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    navigatePreview(targetPath, { pushHistory: false });
  };

  const handleGoForward = () => {
    if (!canGoForward) {
      return;
    }
    const newIndex = historyIndex + 1;
    const targetPath = navigationHistory[newIndex] || "/";
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    navigatePreview(targetPath, { pushHistory: false });
  };

  useEffect(() => {
    if (!authorized && isElementSelectionActive) {
      setIsElementSelectionActive(false);
    }
  }, [authorized, isElementSelectionActive]);

  useEffect(() => {
    hasInitiatedRef.current = {};
    const loadInitialData = async () => {
      const [chatData, sub] = await Promise.all([
        fetchChatDataOptimized(chatId),
        user ? getSubscription() : Promise.resolve(null),
      ]);

      const {
        chat,
        messages: msgs,
        lastAssistantMessage: assistantMsg,
        lastUserMessage: userMsg,
        isLiked: hasLiked,
      } = chatData;

      if (!chat) {
        return;
      }

      if (sub) {
        setSubscription(sub);
      }

      let originalChat = null;
      if (chat.remix_chat_id) {
        originalChat = await fetchChatById(chat.remix_chat_id);
        if (originalChat) {
          setRemixOriginalChat(originalChat);
        }
        setHasAlreadyRemixed(true);
      }

      setIsLiked(hasLiked);
      setFetchedChat(chat);
      setLikesCount(chat.likes || 0);
      setLastAssistantMessage(assistantMsg || null);
      setMessages(msgs as ChatMessage[]);
      setSelectedVersion(userMsg?.version || 0);
      selectedVersionRef.current = userMsg?.version || 0;

      const baseVersion = userMsg?.version ?? 0;
      if (baseVersion > 0) {
        const previousCode = await getArtifactCodeByVersion(
          chatId,
          baseVersion - 1,
        );
        if (previousCode) {
          const previousFiles = extractFilesFromArtifact(previousCode);
          setPreviousArtifactFiles(previousFiles);
        } else {
          setPreviousArtifactFiles([]);
        }
      } else {
        setPreviousArtifactFiles([]);
      }

      const loadInitialData = async () => {
        try {
          const domainPromise = chat.is_deployed
            ? supabase
                .from("custom_domains")
                .select("*")
                .eq("chat_id", chatId)
                .maybeSingle()
                .then((r) => r.data)
            : Promise.resolve(null);

          const subPromise = (async () => {
            try {
              if (!connectedUser?.id) {
                return null;
              }

              const { data } = await supabase
                .from("subscriptions")
                .select("*, prices(*, products(*))")
                .in("status", ["trialing", "active"])
                .eq("user_id", connectedUser.id)
                .maybeSingle();
              return data;
            } catch {
              return null;
            }
          })();

          const githubPromise = (async () => {
            try {
              if (!connectedUser?.id) {
                return null;
              }
              const loggedInUserId = connectedUser.id;

              if (!loggedInUserId) {
                return null;
              }
              const { data } = await supabase
                .from("github_connections")
                .select("*")
                .eq("user_id", loggedInUserId)
                .maybeSingle();
              return data;
            } catch {
              return null;
            }
          })();

          const [domainData, subData, githubData] = await Promise.all([
            domainPromise,
            subPromise,
            githubPromise,
          ]);

          setCustomDomain(domainData);
          setSubscription(subData);
          setGithubConnection(githubData);
        } catch (error) {
          console.error("Error loading initial data:", error);
        }
      };

      loadInitialData();

      setTitle(
        chat.title ||
          `Version #${userMsg?.version && userMsg.version > -1 ? userMsg.version : 0}`,
      );
      setVisible(!chat.is_private);
      setArtifactCode(chat.artifact_code || "");
      setWebcontainerReady(assistantMsg?.is_built || false);
      if (
        assistantMsg?.content?.includes("<!-- FINISH_REASON: length -->") ||
        assistantMsg?.content?.includes("<!-- FINISH_REASON: error -->")
      ) {
        setIsLengthError(true);
      } else {
        setIsLengthError(false);
      }

      const isGenerationIncomplete =
        assistantMsg?.content &&
        !assistantMsg.content.includes("<!-- FINISH_REASON:") &&
        userMsg &&
        msgs &&
        msgs.length >= 2 &&
        msgs[msgs.length - 1]?.role === "assistant";

      if (isGenerationIncomplete) {
        setIsLoading(false);
        setIsSubmitting(false);
        setLoadingState(null);
        setIsScrapingWebsite(false);
        setCompletion(assistantMsg.content);
      }

      if (msgs?.length === 1 && userMsg && !assistantMsg) {
        setCanvas(true);
        setInput(userMsg?.content || "");
        setDefaultImage(userMsg?.prompt_image || null);

        const filesFromMsg = userMsg?.files
          ? Array.isArray(userMsg.files)
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              userMsg.files.map((f: any) => f?.url)
            : []
          : userMsg?.prompt_image
            ? [userMsg.prompt_image]
            : [];
        setDefaultFiles(filesFromMsg);

        if (!hasInitiatedRef.current[chatId]) {
          hasInitiatedRef.current[chatId] = true;
          setIsLoading(true);
          setIsSubmitting(true);
          const isFirstVersion = (userMsg?.version ?? 0) <= 0;
          if (chat.clone_url && isFirstVersion) {
            setIsScrapingWebsite(true);
          }
          complete(userMsg.content || "");
        }
        return;
      }
      if (chat?.framework !== Framework.HTML && chat.framework) {
        const artifactCodeToUse =
          assistantMsg?.artifact_code ||
          chat.artifact_code ||
          defaultArtifactCode[
            chat.framework as keyof typeof defaultArtifactCode
          ];

        if (artifactCodeToUse && assistantMsg?.content) {
          const newArtifactFiles = extractFilesFromArtifact(artifactCodeToUse);
          setArtifactFiles(newArtifactFiles);
          const firstFile = newArtifactFiles[0];
          if (!firstFile) {
            setEditorValue("");
            setActiveTab("");
            return;
          }
          setEditorValue(firstFile.content);
          setActiveTab(firstFile.name || "");
        }
      }
      if (chat?.framework === Framework.HTML && assistantMsg?.content) {
        handleChatFiles(assistantMsg.content, true);
      }

      setIsLoading(false);
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const { completion, stop, complete, setCompletion, input, setInput } =
    useCompletion({
      api: "/api/components",
      fetch: async (url, options) => {
        const requestBody = JSON.parse((options?.body as string) || "{}");
        const promptValue = requestBody.prompt || input;

        const currentFiles = uploadFilesRef.current;

        let aiPrompt = promptValue;
        if (selectedElement) {
          const filePathInfo = selectedElement.filePath
            ? `\nFile: ${selectedElement.filePath}`
            : "";
          const elementContext = `Selected element:${filePathInfo}\n\`\`\`html\n${selectedElement.html.substring(0, 1000)}${selectedElement.html.length > 1000 ? "\n... (truncated)" : ""}\n\`\`\`\n\nTag: ${selectedElement.tagName}\nClasses: ${selectedElement.classes.join(", ")}\n\nModify this element: ${promptValue}`;
          aiPrompt = elementContext;
        }

        const formData = new FormData();
        const libraryPaths: string[] = [];
        currentFiles.forEach((file) => {
          const libraryPath = (file as File & { __libraryPath?: string })
            .__libraryPath;
          if (libraryPath) {
            // Fichier de la bibliothèque - envoyer juste le path
            libraryPaths.push(libraryPath);
          } else {
            // Nouveau fichier - uploader
            formData.append("files", file);
          }
        });
        if (libraryPaths.length > 0) {
          formData.append("libraryPaths", JSON.stringify(libraryPaths));
        }
        formData.append("id", chatId);
        formData.append(
          "selectedVersion",
          String(selectedVersionRef.current ?? selectedVersion),
        );
        formData.append("prompt", promptValue);
        formData.append("aiPrompt", aiPrompt);
        if (selectedElement) {
          formData.append("selectedElement", JSON.stringify(selectedElement));
        }

        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || "An unknown error occurred");
          } catch (e) {
            if (e instanceof Error) {
              throw e;
            }

            // If we can't parse as JSON, try to get the text
            const text = await response.text();
            throw new Error(text || "An unknown error occurred");
          }
        }

        return response;
      },
      streamProtocol: "text",
      initialCompletion: lastAssistantMessage?.content,
      experimental_throttle: 500,
      onError: async (error: Error) => {
        setIsSubmitting(false);
        setIsContinuingFromLengthError(false);
        const artifactCodeToUse =
          fetchedChat?.artifact_code ||
          (fetchedChat?.framework && fetchedChat.framework !== Framework.HTML
            ? defaultArtifactCode[
                fetchedChat.framework as keyof typeof defaultArtifactCode
              ]
            : "");
        const newArtifactFiles = extractFilesFromArtifact(artifactCodeToUse);
        // Merge new files with existing files to keep all project files
        setArtifactFiles((prevFiles) => {
          const fileMap = new Map(prevFiles.map((f) => [f.name, f]));
          newArtifactFiles.forEach((file) => {
            fileMap.set(file.name, file);
          });
          return Array.from(fileMap.values());
        });
        if (error.message === "payment-required-for-image") {
          router.push("/pricing");
          toast({
            variant: "destructive",
            title: "You can't upload images with a free plan",
            description: "Please upgrade to continue.",
            duration: 4000,
          });
          return;
        }
        if (error.message === "chat-corrupted") {
          toast({
            variant: "destructive",
            title: "Component data is corrupted",
            description:
              "This component has missing data and cannot be edited. Please create a new component or remix this one.",
            duration: 6000,
          });
          return;
        }
        if (error.message === "chat-version-not-found") {
          toast({
            variant: "destructive",
            title: "Version not found",
            description:
              "The selected version does not exist. Please select another version.",
            duration: 4000,
          });
          return;
        }
        if (error.message === "limit-exceeded") {
          const restoredVersion =
            selectedVersion !== undefined && selectedVersion > 0
              ? selectedVersion - 1
              : (selectedVersion ?? 0);
          setSelectedVersion(restoredVersion);
          selectedVersionRef.current = restoredVersion;

          const subscription = await getSubscription();
          if (!subscription) {
            const today = new Date();
            const currentPeriodStart = new Date(
              today.getFullYear(),
              today.getMonth(),
              1,
            );
            const maxRockets = ROCKET_LIMITS_PER_PLAN.free.monthly_rockets;
            const resetDate = new Date(
              today.getFullYear(),
              today.getMonth() + 1,
              1,
            );

            const currentPeriodFormatted = format(
              currentPeriodStart,
              "d MMMM yyyy",
            );

            setIsLoading(false);
            setCanvas(true);
            toast({
              variant: "destructive",
              title: "Monthly Rocket limit reached",
              description: (
                <div>
                  <p>
                    You have reached your limit of {maxRockets} 🚀 Rockets for
                    this month (starting {currentPeriodFormatted}). This limit
                    will reset next month ({format(resetDate, "d MMMM yyyy")}).
                  </p>
                  <div className="mt-2 flex flex-col space-y-2">
                    <Button
                      onClick={() => router.push("/pricing")}
                      className="w-full"
                    >
                      Upgrade to a paid plan
                    </Button>
                    <Button
                      onClick={() => router.push("/account?buy_rockets=true")}
                      variant="outline"
                      className="w-full"
                    >
                      Buy Rockets ($1 each)
                    </Button>
                  </div>
                </div>
              ),
              duration: 10000,
            });
            return;
          }
          const planName =
            subscription.prices?.products?.name?.toLowerCase() || "free";
          const maxRockets =
            ROCKET_LIMITS_PER_PLAN[
              planName as keyof typeof ROCKET_LIMITS_PER_PLAN
            ]?.monthly_rockets || ROCKET_LIMITS_PER_PLAN.free.monthly_rockets;
          const currentPeriodStart = new Date(
            subscription.current_period_start,
          );
          const resetDate = format(
            new Date(
              currentPeriodStart.getFullYear(),
              currentPeriodStart.getMonth() + 1,
              1,
            ),
            "d MMMM yyyy",
          );
          setIsLoading(false);
          setCanvas(true);

          toast({
            variant: "destructive",
            title: "You have reached the limit of your plan",
            description: (
              <div>
                <p>
                  You have reached your limit of {maxRockets} 🚀 Rockets for{" "}
                  {subscription.prices?.interval}. This limit will reset on{" "}
                  {resetDate}.
                </p>
                <div className="mt-2 flex flex-col space-y-2">
                  <Button
                    onClick={() => router.push("/account")}
                    className="w-full"
                  >
                    Go to My Account
                  </Button>
                  <Button
                    onClick={() => router.push("/account?buy_rockets=true")}
                    variant="outline"
                    className="w-full"
                  >
                    Buy Rockets ($1 each)
                  </Button>
                </div>
              </div>
            ),
            duration: 10000,
          });

          return;
        }
        if (error.message) {
          setIsLoading(false);
          setCanvas(true);
          toast({
            variant: "destructive",
            title: "Something went wrong",
            description: error.message,
            duration: 4000,
          });
        }
      },
      onFinish: async () => {
        try {
          setIsSubmitting(false);
          setIsContinuingFromLengthError(false);
          await refreshChatData();
          const refreshedLastAssistantMessage =
            await fetchLastAssistantMessageByChatId(chatId);

          if (refreshedLastAssistantMessage) {
            handleVersionSelect(refreshedLastAssistantMessage.version);

            // Check if we have a special marker for finish reason
            const content = refreshedLastAssistantMessage.content || "";
            if (content.includes("<!-- FINISH_REASON: length -->")) {
              setIsLengthError(true);
              toast({
                variant: "default",
                title: "Continue your work",
                description: `The AI reached its token limit. No worries, you can continue by clicking the "Continue your work" button and iterate again.`,
                duration: 6000,
              });

              // Remove the marker from the content
              const cleanedContent = content.replace(
                "\n\n<!-- FINISH_REASON: length -->",
                "",
              );
              setCompletion(cleanedContent);
            } else if (content.includes("<!-- FINISH_REASON: error -->")) {
              setIsLengthError(true);
              toast({
                variant: "destructive",
                title: "Something went wrong",
                description: "An error occurred during generation",
                duration: 4000,
              });

              // Remove the marker from the content
              const cleanedContent = content.replace(
                "\n\n<!-- FINISH_REASON: error -->",
                "",
              );
              setCompletion(cleanedContent);
            } else {
              setIsLengthError(false);
            }
          } else {
            // Handle case where no assistant message was generated
            console.error(
              "No assistant message generated - AI generation may have failed",
            );
            setIsLengthError(true);
            toast({
              variant: "destructive",
              title: "Generation failed",
              description:
                "The AI failed to generate content. This may be due to prompt complexity. Please try again or simplify your request.",
              duration: 6000,
            });
          }

          setInput("");
          await new Promise((resolve) => setTimeout(resolve, 500));
          setIsLoading(false);
          setCanvas(true);
          setUploadFiles([]);
        } catch (error) {
          console.error("Error in onFinish:", error);
          setIsLoading(false);
          setIsSubmitting(false);
          setCanvas(true);
        }
      },
    });

  useEffect(() => {
    if (completion && isLoading) {
      const fileNameMatch = completion.match(
        /<coderocketFile\s+name=["']([^"']*?)["']/g,
      );
      if (fileNameMatch) {
        const allFileNames = fileNameMatch.map((match) => {
          const nameMatch = match.match(/name=["']([^"']*?)["']/);
          return nameMatch ? nameMatch[1] : null;
        });
        const lastFileName = allFileNames[allFileNames.length - 1];
        if (lastFileName) {
          if (lastFileName !== currentGeneratingFile) {
            setCurrentGeneratingFile(lastFileName);
            setActiveTab(lastFileName);
          }

          setArtifactCode((prevArtifactCode) => {
            const newArtifactCode = getUpdatedArtifactCode(
              completion,
              prevArtifactCode,
            );
            const newFiles = extractFilesFromArtifact(
              newArtifactCode,
              prevArtifactCode,
              completion,
            );

            if (newFiles.length > 0) {
              setArtifactFiles((prevFiles) => {
                const fileMap = new Map(prevFiles.map((f) => [f.name, f]));
                newFiles.forEach((file) => {
                  fileMap.set(file.name, file);
                });
                return Array.from(fileMap.values());
              });

              const activeFile = newFiles.find((f) => f.name === lastFileName);
              if (activeFile) {
                setEditorValue(activeFile.content);
              }
            }

            return newArtifactCode;
          });
        }
      }
    } else if (!isLoading && currentGeneratingFile) {
      setCurrentGeneratingFile(null);
    }
  }, [completion, isLoading, currentGeneratingFile]);

  const handleSubmitToAI = async (inputData: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setForceBuild(true);
    setCompletion("");
    setWebcontainerReady(false);
    setChatFiles([]);
    setCanvas(true);
    setCurrentGeneratingFile(null);

    const isIteration = (selectedVersion ?? 0) > 0;
    const lower = inputData.toLowerCase();
    const isCloneAnotherPage =
      lower.includes("clone another page") ||
      lower.includes("clone another page:");

    if (isIteration && !isCloneAnotherPage) {
      setIsScrapingWebsite(false);
    }

    const previousVersion = selectedVersion ?? 0;
    const newVersion = previousVersion + 1;
    setPreviousArtifactFiles(artifactFiles);
    setSelectedVersion(newVersion);
    selectedVersionRef.current = newVersion;

    if (user && fetchedChat) {
      const optimisticMessage: ChatMessage = {
        id: -Date.now(),
        chat_id: chatId,
        content: inputData,
        role: "user",
        version: newVersion,
        created_at: new Date().toISOString(),
        artifact_code: null,
        build_error: null,
        screenshot: null,
        prompt_image: null,
        files: null,
        input_tokens: null,
        output_tokens: null,
        subscription_type: null,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
        selected_element: selectedElement || null,
        cost_usd: null,
        is_built: null,
        is_github_pull: null,
        migration_executed_at: null,
        migrations_executed: null,
        model_used: null,
        theme: null,
        clone_another_page: null,
        chats: {
          user: user,
          prompt_image: null,
          remix_chat_id: null,
        },
      };
      setMessages((prev) => [...prev, optimisticMessage]);
    }

    clearSelectedElement();

    complete(inputData);
    setIsLoading(true);
  };

  const handleVersionSelect = (version: number, tabName?: string) => {
    // If we're just changing tabs on the same version, don't trigger a rebuild
    const isTabChangeOnly = version === selectedVersion && tabName;

    if (!isTabChangeOnly) {
      setSelectedVersion(version);
      selectedVersionRef.current = version;
      setUploadFiles([]);
    }

    const selectedMessages = messages.filter((m) => m.version == version);
    if (selectedMessages.length !== 2) {
      return;
    }

    const selectedAssistantMessage = selectedMessages.find(
      (m) => m.role === "assistant",
    );
    if (!selectedAssistantMessage?.content) {
      return;
    }

    if (!isTabChangeOnly) {
      if (version > 0) {
        void (async () => {
          const previousCode = await getArtifactCodeByVersion(
            chatId,
            version - 1,
          );
          if (previousCode) {
            const previousFiles = extractFilesFromArtifact(previousCode);
            setPreviousArtifactFiles(previousFiles);
          } else {
            setPreviousArtifactFiles([]);
          }
        })();
      } else {
        setPreviousArtifactFiles([]);
      }
    }

    // Only update these states if version actually changed
    if (!isTabChangeOnly) {
      if (
        selectedAssistantMessage.content.includes(
          "<!-- FINISH_REASON: length -->",
        ) ||
        selectedAssistantMessage.content.includes(
          "<!-- FINISH_REASON: error -->",
        )
      ) {
        setIsLengthError(true);
      } else {
        setIsLengthError(false);
      }

      setCompletion(selectedAssistantMessage.content);
    }

    // Use the message's artifact_code if available, otherwise calculate it
    if (selectedAssistantMessage.artifact_code) {
      // Only update artifact files if version changed
      if (!isTabChangeOnly) {
        // Set the artifact code from the message
        setArtifactCode(selectedAssistantMessage.artifact_code);

        // Extract files from the artifact code
        const newArtifactFiles = extractFilesFromArtifact(
          selectedAssistantMessage.artifact_code,
        );

        // Determine if we need to merge with default template files
        const needsTemplateFiles =
          newArtifactFiles.length === 0 &&
          fetchedChat?.framework &&
          fetchedChat.framework !== Framework.HTML;

        if (needsTemplateFiles) {
          const templateFiles = extractFilesFromArtifact(
            defaultArtifactCode[
              fetchedChat.framework as keyof typeof defaultArtifactCode
            ],
          );
          setArtifactFiles(templateFiles);
        } else {
          setArtifactFiles(newArtifactFiles);
        }

        // Handle file selection
        const files = extractFilesFromCompletion(
          selectedAssistantMessage.content,
        );
        if (files.length > 0) {
          setChatFiles(files);
        } else {
          setChatFiles([]);
        }
      }

      // Always handle tab selection (whether version changed or not)
      const currentFiles = isTabChangeOnly
        ? artifactFiles
        : extractFilesFromArtifact(selectedAssistantMessage.artifact_code);

      if (tabName) {
        const file = currentFiles.find((file) => file.name === tabName);
        if (file) {
          setEditorValue(file.content);
          setActiveTab(tabName);
          setCanvas(false);
        }
      } else if (!isTabChangeOnly) {
        // Select appropriate file to display only if version changed
        const activeFile =
          currentFiles.find((file) => file.isActive) || currentFiles[0];
        if (activeFile) {
          setEditorValue(activeFile.content);
          setActiveTab(activeFile.name || "");
          setCanvas(true);
        }
      }
    }

    // Only update webcontainer ready state if version changed
    if (!isTabChangeOnly) {
      // Always check latest build status and force rebuild if needed
      // When versions are deleted, all builds become invalid
      const shouldBeReady = selectedAssistantMessage.is_built && !forceBuild;
      setWebcontainerReady(shouldBeReady || false);
    }
  };

  const share = () => {
    const link = fetchedChat?.slug
      ? `https://www.coderocket.app/components/${fetchedChat.slug}`
      : window.location.href;
    setShareLink(link);
    setIsShareModalOpen(true);
    copy(link);
    toast({
      variant: "default",
      title: "Successfully copied",
      description: "The URL has been successfully saved to your clipboard",
      duration: 4000,
    });
  };

  const refreshChat = useCallback(async () => {
    const refreshedChat = await fetchChatById(chatId);
    if (!refreshedChat) return;
    setFetchedChat(refreshedChat);
    setLikesCount(refreshedChat.likes || 0);
  }, [chatId]);

  const refreshChatData = useCallback(async () => {
    const refreshedChatMessages = await fetchMessagesByChatId(chatId, false);
    if (!refreshedChatMessages) return;
    setMessages(refreshedChatMessages);
    const refreshedChat = await fetchChatById(chatId);
    if (!refreshedChat) return;
    setFetchedChat(refreshedChat);
    setLikesCount(refreshedChat.likes || 0);
    const artifactCodeFromVersion = await getArtifactCodeByVersion(
      chatId,
      selectedVersion,
    );
    setArtifactCode(artifactCodeFromVersion || "");
    const title = refreshedChat.title || `Version #${selectedVersion}`;
    setTitle(title);
    document.title = `${title} - CodeRocket`;

    if (refreshedChat.is_deployed) {
      try {
        const domainPromise = supabase
          .from("custom_domains")
          .select("*")
          .eq("chat_id", chatId)
          .maybeSingle()
          .then((r) => r.data);

        const subPromise = (async () => {
          try {
            if (!connectedUser?.id) return null;

            const { data } = await supabase
              .from("subscriptions")
              .select("*, prices(*, products(*))")
              .in("status", ["trialing", "active"])
              .eq("user_id", connectedUser.id)
              .maybeSingle();
            return data;
          } catch {
            return null;
          }
        })();

        const githubPromise = (async () => {
          try {
            if (!connectedUser?.id) return null;

            const { data } = await supabase
              .from("github_connections")
              .select("*")
              .eq("user_id", connectedUser.id)
              .maybeSingle();
            return data;
          } catch {
            return null;
          }
        })();

        const [domainData, subData, githubData] = await Promise.all([
          domainPromise,
          subPromise,
          githubPromise,
        ]);

        setCustomDomain(domainData);
        setSubscription(subData);
        setGithubConnection(githubData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    return refreshedChatMessages;
  }, [chatId, selectedVersion, connectedUser?.id, supabase]);

  const handleChatFiles = (
    _completion: string,
    isFirstRun?: boolean,
    tabName?: string,
  ) => {
    setArtifactCode((prevArtifactCode) => {
      const newArtifactCode = getUpdatedArtifactCode(
        _completion,
        prevArtifactCode,
      );
      const newArtifactFiles = extractFilesFromArtifact(
        newArtifactCode,
        prevArtifactCode,
        _completion,
      );

      // Merge new files with existing files to keep all project files
      setArtifactFiles((prevFiles) => {
        const fileMap = new Map(prevFiles.map((f) => [f.name, f]));
        newArtifactFiles.forEach((file) => {
          fileMap.set(file.name, file);
        });
        return Array.from(fileMap.values());
      });

      const files = extractFilesFromCompletion(_completion);

      if (files.length > 0) {
        setChatFiles(files);
      } else {
        setChatFiles([]);
      }
      if (tabName) {
        const file = newArtifactFiles.find((file) => file.name === tabName);

        if (!file) {
          setEditorValue("");
          setActiveTab("");
          return newArtifactCode;
        }
        setEditorValue(file.content);
        setActiveTab(tabName);
        setCanvas(false);
        return newArtifactCode;
      }

      if (isFirstRun) {
        const firstFile = newArtifactFiles[0];
        if (!firstFile) {
          setEditorValue("");
          setActiveTab("");
          return newArtifactCode;
        }
        setEditorValue(firstFile.content);
        setActiveTab(firstFile.name || "");
        setCanvas(true);
        return newArtifactCode;
      }
      if (!newArtifactFiles.length) {
        return newArtifactCode;
      }
      const activeFile = newArtifactFiles.find((file) => file.isActive);

      if (!activeFile) {
        return newArtifactCode;
      }
      setEditorValue(activeFile.content);
      setActiveTab(activeFile.name || "");
      if (!isLoading) {
        setCanvas(true);
      }

      return newArtifactCode;
    });
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        stop();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  });

  useEffect(() => {
    if (isModalOpen && typeof window !== "undefined" && window.closeCrispChat) {
      window.closeCrispChat();
    }
  }, [isModalOpen]);

  const handleFullscreenToggle = (isOpen: boolean) => {
    setIsModalOpen(isOpen);
  };

  const handleLikeClick = async () => {
    if (!connectedUser) {
      toast({
        title: "Can't like component",
        description: "Please login to like a component",
        duration: 4000,
      });
      return;
    }

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount((prev) => (newIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    const result = await toggleChatLike(chatId);

    if (result?.error) {
      setIsLiked(!newIsLiked);
      setLikesCount((prev) => (newIsLiked ? Math.max(0, prev - 1) : prev + 1));
    } else {
      await refreshChat();
    }
  };

  const handleRemixClick = async () => {
    if (isRemixing) return;
    if (!subscription) {
      toast({
        variant: "destructive",
        title: "Subscription required",
        description:
          "Only subscribers can remix projects. Please upgrade to create remixes.",
        duration: 4000,
      });
      setIsRemixing(false);
      return;
    }

    try {
      setIsRemixing(true);
      const newChat = await remixChat(chatId, selectedVersion);

      toast({
        variant: "default",
        title: "Project remixed",
        description: "Your remix has been created successfully!",
        duration: 4000,
      });

      // Redirect to the new chat
      router.push(`/components/${newChat.slug}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Remix failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create remix. Please try again.",
        duration: 4000,
      });
      setIsRemixing(false);
    }
  };

  const contextValue = {
    isCanvas,
    setCanvas,
    isLoading,
    selectedVersion,
    setSelectedVersion,
    chatFiles,
    activeTab,
    editorValue,
    handleVersionSelect,
    authorized,
    completion,
    messages,
    user,
    handleChatFiles,
    refreshChatData,
    isVisible,
    setVisible,
    input,
    setInput,
    handleSubmitToAI,
    setCompletion,
    artifactCode,
    setArtifactCode,
    chatId,
    artifactFiles,
    previousArtifactFiles,
    setPreviousArtifactFiles,
    selectedFramework: (fetchedChat?.framework || "react") as Framework,
    isWebcontainerReady,
    setWebcontainerReady,
    forceBuild,
    setForceBuild,
    files: uploadFiles,
    setFiles: setUploadFiles,
    defaultImage,
    defaultFiles,
    loadingState,
    setLoadingState,
    fetchedChat,
    isLengthError,
    sidebarTab,
    setSidebarTab,
    currentGeneratingFile,
    iframeKey,
    refreshChat,
    customDomain,
    subscription,
    githubConnection,
    breakpoint,
    setBreakpoint,
    previewPath,
    navigatePreview,
    addressBarValue,
    setAddressBarValue,
    setPreviewPath,
    syncPreviewPath,
    isScrapingWebsite,
    setIsScrapingWebsite,
    isContinuingFromLengthError,
    setIsContinuingFromLengthError,
    connectedUser,
    isElementSelectionActive,
    setElementSelectionActive,
    selectedElement,
    setSelectedElement,
    clearSelectedElement,
  };

  useEffect(() => {
    if (fetchedChat?.likes !== undefined) {
      setLikesCount(fetchedChat.likes || 0);
    }
  }, [fetchedChat?.likes]);

  useEffect(() => {
    const channel = supabase
      .channel(`component-sync-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async () => {
          if (isLoading) return;
          await refreshChatData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          setMessages((prevMessages) => {
            const existingIndex = prevMessages.findIndex(
              (m) => m.id === payload.new.id,
            );
            if (existingIndex >= 0) {
              return prevMessages.map((message) =>
                message.id === payload.new.id
                  ? { ...message, ...payload.new }
                  : message,
              );
            } else {
              const filteredMessages = prevMessages.filter(
                (m) =>
                  !(
                    m.id < 0 &&
                    m.role === payload.new.role &&
                    m.version === payload.new.version
                  ),
              );
              return [...filteredMessages, payload.new as ChatMessage];
            }
          });

          if (
            (payload.old.version === -1 || payload.old.version === undefined) &&
            payload.new.version === 0
          ) {
            setSelectedVersion(0);
            selectedVersionRef.current = 0;
          }

          if (
            payload.new.version === selectedVersion &&
            payload.new.is_built === true &&
            !isLoading
          ) {
            setWebcontainerReady(true);
            setForceBuild(false);
          }

          if (
            payload.new.role === "assistant" &&
            payload.new.version === selectedVersion &&
            payload.new.screenshot &&
            payload.new.screenshot !== payload.old?.screenshot
          ) {
            setLastAssistantMessage(payload.new as Tables<"messages">);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          setMessages((prevMessages) =>
            prevMessages.filter((m) => m.id !== payload.old.id),
          );
          if (isLoading) return;
          await refreshChatData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chats",
          filter: `id=eq.${chatId}`,
        },
        async (payload) => {
          if (fetchedChat) {
            const updatedChat = { ...fetchedChat, ...payload.new };
            setFetchedChat(updatedChat as Tables<"chats">);

            if (payload.new.likes !== undefined) {
              setLikesCount(payload.new.likes as number);
            }

            if (
              payload.new.title !== undefined &&
              payload.new.title !== title
            ) {
              const newTitle =
                (payload.new.title as string) ||
                `Version #${selectedVersion ?? 0}`;
              setTitle(newTitle);
              document.title = `${newTitle} - CodeRocket`;
            }

            if (payload.new.is_private !== undefined) {
              setVisible(!(payload.new.is_private as boolean));
            }

            if (
              payload.new.is_deployed !== undefined &&
              payload.new.is_deployed
            ) {
              try {
                const { data: domainData } = await supabase
                  .from("custom_domains")
                  .select("*")
                  .eq("chat_id", chatId)
                  .maybeSingle();
                if (domainData) {
                  setCustomDomain(domainData);
                }
              } catch (error) {
                console.error("Error fetching custom domain:", error);
              }
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "custom_domains",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          setCustomDomain(payload.new as CustomDomainData);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "custom_domains",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          setCustomDomain(payload.new as CustomDomainData);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "custom_domains",
          filter: `chat_id=eq.${chatId}`,
        },
        async () => {
          setCustomDomain(null);
        },
      );

    if (connectedUser?.id) {
      channel
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "subscriptions",
            filter: `user_id=eq.${connectedUser.id}`,
          },
          async (payload) => {
            if (
              payload.new.status === "active" ||
              payload.new.status === "trialing"
            ) {
              try {
                const { data } = await supabase
                  .from("subscriptions")
                  .select("*, prices(*, products(*))")
                  .eq("id", payload.new.id)
                  .maybeSingle();
                if (data) {
                  setSubscription(data);
                }
              } catch (error) {
                console.error("Error fetching subscription:", error);
              }
            } else {
              setSubscription(null);
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "github_connections",
            filter: `user_id=eq.${connectedUser.id}`,
          },
          async (payload) => {
            setGithubConnection(payload.new as Tables<"github_connections">);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "github_connections",
            filter: `user_id=eq.${connectedUser.id}`,
          },
          async (payload) => {
            setGithubConnection(payload.new as Tables<"github_connections">);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "github_connections",
            filter: `user_id=eq.${connectedUser.id}`,
          },
          async () => {
            setGithubConnection(null);
          },
        );
    }

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [
    chatId,
    selectedVersion,
    isLoading,
    supabase,
    fetchedChat,
    title,
    connectedUser?.id,
    refreshChatData,
  ]);

  return (
    <ComponentContext.Provider value={contextValue}>
      <BuilderProvider>
        <Container className="p-0! lg:overflow-hidden">
          <div className="grid size-full max-h-full grid-cols-1 justify-center xl:grid-cols-4 xl:flex-row">
            <div className="col-span-1 flex size-full min-h-full flex-col xl:col-span-3 xl:mb-0">
              <div className="relative flex h-auto flex-col items-center justify-start py-1.5 pr-2 xl:h-12 xl:flex-row xl:justify-between xl:pl-14">
                <h1 className="mb-2 flex max-w-full min-w-0 flex-1 items-center gap-2 font-medium lg:mb-0">
                  {title ||
                  fetchedChat?.title ||
                  selectedVersion !== undefined ? (
                    <>
                      <p className="mx-10 max-w-full min-w-0 xl:mx-0">
                        <span className="block truncate text-center first-letter:uppercase">
                          {title ||
                            fetchedChat?.title ||
                            `Version #${selectedVersion}`}
                        </span>
                      </p>
                      {fetchedChat?.is_deployed &&
                        fetchedChat?.deploy_subdomain &&
                        fetchedChat?.deployed_version !== undefined && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={`https://${
                                  customDomain?.is_verified &&
                                  customDomain?.domain
                                    ? customDomain.domain
                                    : `${fetchedChat.deploy_subdomain}.coderocket.app`
                                }`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-500/20 dark:text-green-400"
                              >
                                <Rocket className="size-3" />
                                <span className="hidden sm:inline">
                                  Deployed v{fetchedChat.deployed_version}
                                </span>
                                <span className="sm:hidden">
                                  v{fetchedChat.deployed_version}
                                </span>
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Live at{" "}
                                {customDomain?.is_verified &&
                                customDomain?.domain
                                  ? customDomain.domain
                                  : `${fetchedChat.deploy_subdomain}.coderocket.app`}
                              </p>
                              <p className="text-xs">
                                Version #{fetchedChat.deployed_version}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                    </>
                  ) : (
                    <span className="flex items-center">
                      <Loader className="mr-2 size-4 animate-spin" />
                      Loading
                    </span>
                  )}
                </h1>
                <div className="ml-2 flex items-center gap-2">
                  <Tabs
                    value={isCanvas ? "canvas" : "code"}
                    className="w-full"
                    onValueChange={(value) => setCanvas(value === "canvas")}
                  >
                    <TabsList className="grid w-fit grid-cols-2 text-xs">
                      <TabsTrigger
                        value="canvas"
                        className="flex items-center justify-center"
                      >
                        <Eye className="size-4 md:hidden" />
                        <span className="hidden text-xs md:inline">
                          Preview
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="code"
                        className="flex items-center justify-center"
                      >
                        <CodeIcon className="size-4 md:hidden" />
                        <span className="hidden text-xs md:inline">Code</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (isLoading || isLengthError) {
                            return;
                          }
                          if (!isVisible) {
                            setIsShareModalOpen(true);
                            return;
                          }
                          share();
                        }}
                        disabled={isLoading || isLengthError}
                        className="relative flex items-center gap-1.5"
                      >
                        <Share className="w-5" />
                        <Badge
                          variant="default"
                          className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                        >
                          New
                        </Badge>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Share</p>
                    </TooltipContent>
                  </Tooltip>
                  {isUserLoggedIn && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              if (isRemixing || isLoading) {
                                return;
                              }
                              setIsRemixModalOpen(true);
                            }}
                            disabled={isRemixing || isLoading}
                            className="flex items-center"
                          >
                            <GitFork className="w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remix</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleLikeClick}
                            disabled={isLoading}
                            className={cn(
                              "flex items-center gap-1",
                              isLiked && "text-primary",
                            )}
                          >
                            <Heart
                              className={cn(
                                "w-5",
                                isLiked && "text-primary fill-primary",
                              )}
                              fill={isLiked ? "currentColor" : "none"}
                            />
                            {likesCount > 0 && (
                              <span
                                className={cn(
                                  "font-medium",
                                  isLiked && "text-primary",
                                )}
                              >
                                {likesCount}
                              </span>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {isLiked
                              ? "Remove from liked components"
                              : "Add to liked components"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="block xl:hidden"
                      >
                        <Layers className="size-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="h-full p-0">
                      <ComponentSidebar className="flex xl:hidden" />
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
              {isCanvas && (
                <div className="border-border bg-secondary flex items-center gap-2 overflow-x-auto border-t p-2">
                  <div className="flex shrink-0 items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsModalOpen(true)}
                          className="flex items-center"
                          disabled={
                            isLoading ||
                            isLengthError ||
                            !isWebcontainerReady ||
                            loadingState === "processing" ||
                            loadingState === "starting" ||
                            loadingState === "error"
                          }
                        >
                          <Fullscreen className="w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isLengthError ? (
                          <p>The component has an error</p>
                        ) : (
                          <p>Display in fullscreen</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (isLengthError) {
                              return;
                            }
                            const url =
                              fetchedChat?.framework === Framework.HTML
                                ? `https://www.coderocket.app/content/${chatId}/${selectedVersion}`
                                : `https://${chatId}-${selectedVersion}.preview.coderocket.app${sharePathSuffix}`;
                            window.open(url, "_blank");
                          }}
                          className="flex items-center"
                          disabled={
                            isLoading || isLengthError || !isWebcontainerReady
                          }
                        >
                          <ExternalLink className="w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isLengthError
                            ? "The component has an error"
                            : "Open in a new tab"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="border-border bg-background flex min-w-0 flex-1 items-center gap-2 rounded-md border p-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="size-8 shrink-0"
                      onClick={handleGoBack}
                      disabled={!canGoBack || !isNavigationEnabled}
                    >
                      <ArrowLeft className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="size-8 shrink-0"
                      onClick={handleGoForward}
                      disabled={!canGoForward || !isNavigationEnabled}
                    >
                      <ArrowRight className="size-4" />
                    </Button>
                    <form
                      onSubmit={handleAddressSubmit}
                      className="min-w-0 flex-1"
                    >
                      <Input
                        ref={addressInputRef}
                        value={addressBarValue}
                        onChange={(event) =>
                          setAddressBarValue(event.target.value)
                        }
                        onFocus={() => setAddressFocused(true)}
                        onBlur={() => setAddressFocused(false)}
                        disabled={!isNavigationEnabled}
                        placeholder={navigationPlaceholder}
                        className={cn(
                          "h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0",
                          !addressFocused && "text-muted-foreground",
                        )}
                      />
                    </form>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="size-8 shrink-0"
                          onClick={() => {
                            if (addressBarValue !== "/") {
                              ignoreNextRootRouteRef.current = true;
                            }
                            setPreviewPath(addressBarValue);
                            setIframeKey((prev) => prev + 1);
                          }}
                          disabled={
                            isLoading ||
                            isLengthError ||
                            !isWebcontainerReady ||
                            loadingState === "processing" ||
                            loadingState === "starting" ||
                            loadingState === "error"
                          }
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reload preview</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="border-border bg-background flex shrink-0 items-center rounded-md border">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBreakpoint("desktop")}
                          className={cn(
                            "h-8 rounded-r-none px-2",
                            breakpoint === "desktop" && "bg-secondary",
                          )}
                          disabled={
                            isLoading ||
                            isLengthError ||
                            !isWebcontainerReady ||
                            loadingState === "processing" ||
                            loadingState === "starting" ||
                            loadingState === "error"
                          }
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Desktop</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBreakpoint("tablet")}
                          className={cn(
                            "h-8 rounded-none px-2",
                            breakpoint === "tablet" && "bg-secondary",
                          )}
                          disabled={
                            isLoading ||
                            isLengthError ||
                            !isWebcontainerReady ||
                            loadingState === "processing" ||
                            loadingState === "starting" ||
                            loadingState === "error"
                          }
                        >
                          <Tablet className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tablet</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBreakpoint("mobile")}
                          className={cn(
                            "h-8 rounded-l-none px-2",
                            breakpoint === "mobile" && "bg-secondary",
                          )}
                          disabled={
                            isLoading ||
                            isLengthError ||
                            !isWebcontainerReady ||
                            loadingState === "processing" ||
                            loadingState === "starting" ||
                            loadingState === "error"
                          }
                        >
                          <Smartphone className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mobile</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {authorized && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setIsElementSelectionActive(
                              !isElementSelectionActive,
                            )
                          }
                          className={cn(
                            "relative flex h-8 items-center gap-1.5 px-2",
                            isElementSelectionActive &&
                              "bg-primary text-primary-foreground hover:bg-primary/90 border-primary",
                          )}
                          disabled={
                            isLoading ||
                            isLengthError ||
                            !isWebcontainerReady ||
                            loadingState === "processing" ||
                            loadingState === "starting" ||
                            loadingState === "error"
                          }
                        >
                          <Crosshair className="h-4 w-4" />
                          {!isElementSelectionActive && (
                            <Badge
                              variant="default"
                              className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                            >
                              New
                            </Badge>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isElementSelectionActive
                            ? "Disable element selection"
                            : "Enable element selection"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Dialog
                    open={isModalOpen}
                    onOpenChange={handleFullscreenToggle}
                  >
                    <DialogContent className="z-9999 h-full w-full max-w-full! rounded-none p-10">
                      <DialogTitle className="hidden">Fullscreen</DialogTitle>
                      <DialogDescription
                        className={cn(
                          "z-50 flex items-center justify-center",
                          breakpoint === "tablet" && "bg-muted",
                          breakpoint === "mobile" && "bg-muted",
                        )}
                      >
                        <div
                          className={cn(
                            "relative transition-all duration-300",
                            breakpoint === "desktop" && "size-full",
                            breakpoint === "tablet" &&
                              "w-[768px] h-[1024px] max-w-full max-h-full shadow-2xl",
                            breakpoint === "mobile" &&
                              "w-[375px] h-[667px] max-w-full max-h-full shadow-2xl",
                          )}
                        >
                          {fetchedChat?.framework !== Framework.HTML &&
                          isWebcontainerReady ? (
                            <iframe
                              key={iframeKey}
                              className="size-full rounded-md border-none"
                              src={`https://${chatId}-${selectedVersion}.webcontainer.coderocket.app${previewPathSuffix}`}
                              loading="eager"
                            />
                          ) : (
                            <RenderHtmlComponent
                              key={iframeKey}
                              files={artifactFiles}
                              navigationTarget={previewPath}
                              onNavigation={(path) => navigatePreview(path)}
                              onRouteChange={(path) => syncPreviewPath(path)}
                            />
                          )}
                        </div>
                      </DialogDescription>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              <div className="relative m-0 flex h-full max-h-full flex-1 flex-col border-t lg:border-b-0">
                {!isLoading && isCanvas && (
                  <div className="absolute left-0 bottom-0 z-9000 flex w-full items-center justify-end gap-2 p-2">
                    {fetchedChat?.clone_url && (
                      <ClonedUrlBadge
                        url={fetchedChat.clone_url}
                        showTooltip={true}
                      />
                    )}
                    {remixOriginalChat && (
                      <RemixOriginalBadge
                        originalChat={remixOriginalChat}
                        showTooltip={true}
                      />
                    )}
                  </div>
                )}
                <CodePreview />
              </div>
            </div>
            <ComponentSidebar className="hidden xl:flex" />
          </div>
          <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-w-5xl">
              <div className="mb-6 flex flex-col items-center justify-center text-center">
                <Share className="text-primary mb-2 size-12" />
                <DialogTitle className="text-xl font-semibold text-white">
                  Share Your Component
                </DialogTitle>
                <p className="text-muted-foreground">
                  Let the world see your awesome creation! ✨
                </p>
              </div>
              <DialogDescription>
                {!isVisible ? (
                  <div className="space-y-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      This component is currently private and cannot be shared.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      To share it, change its visibility to public in the
                      settings.
                    </p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "grid gap-6",
                      lastAssistantMessage?.screenshot
                        ? "grid-cols-1 lg:grid-cols-2"
                        : "grid-cols-1",
                    )}
                  >
                    <div className="space-y-6">
                      <div>
                        <p className="mb-3 text-sm font-medium text-white">
                          Share on social media:
                        </p>
                        <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                          <div className="flex flex-col items-center gap-2">
                            <TwitterShareButton
                              url={shareLink}
                              title={
                                fetchedChat?.title
                                  ? `${fetchedChat.title} - Built with CodeRocket 🚀`
                                  : "Check out this awesome component built with CodeRocket! 🚀"
                              }
                              hashtags={["CodeRocket", "TailwindCSS", "WebDev"]}
                              className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                            >
                              <XIcon size={48} round />
                            </TwitterShareButton>
                            <span className="text-xs text-white">X</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <FacebookShareButton
                              url={shareLink}
                              className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                            >
                              <FacebookIcon size={48} round />
                            </FacebookShareButton>
                            <span className="text-xs text-white">Facebook</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <LinkedinShareButton
                              url={shareLink}
                              title={
                                fetchedChat?.title
                                  ? `${fetchedChat.title} - Built with CodeRocket`
                                  : "Component built with CodeRocket"
                              }
                              summary="Check out this awesome component built with CodeRocket!"
                              className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                            >
                              <LinkedinIcon size={48} round />
                            </LinkedinShareButton>
                            <span className="text-xs text-white">LinkedIn</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <RedditShareButton
                              url={shareLink}
                              title={
                                fetchedChat?.title
                                  ? `${fetchedChat.title} - Built with CodeRocket 🚀`
                                  : "Check out this awesome component!"
                              }
                              className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                            >
                              <RedditIcon size={48} round />
                            </RedditShareButton>
                            <span className="text-xs text-white">Reddit</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <TelegramShareButton
                              url={shareLink}
                              title={
                                fetchedChat?.title
                                  ? `${fetchedChat.title} - Built with CodeRocket 🚀`
                                  : "Check out this awesome component!"
                              }
                              className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                            >
                              <TelegramIcon size={48} round />
                            </TelegramShareButton>
                            <span className="text-xs text-white">Telegram</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <WhatsappShareButton
                              url={shareLink}
                              title={
                                fetchedChat?.title
                                  ? `${fetchedChat.title} - Built with CodeRocket 🚀`
                                  : "Check out this awesome component!"
                              }
                              className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                            >
                              <WhatsappIcon size={48} round />
                            </WhatsappShareButton>
                            <span className="text-xs text-white">WhatsApp</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <EmailShareButton
                              url={shareLink}
                              subject={
                                fetchedChat?.title
                                  ? `Check out ${fetchedChat.title} on CodeRocket!`
                                  : "Check out this component on CodeRocket!"
                              }
                              body="I found this awesome component built with CodeRocket. Check it out!"
                              className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                            >
                              <EmailIcon size={48} round />
                            </EmailShareButton>
                            <span className="text-xs text-white">Email</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <button
                              onClick={() => {
                                const text = fetchedChat?.title
                                  ? `${fetchedChat.title} - Built with CodeRocket 🚀\n${shareLink}`
                                  : `Check out this awesome component built with CodeRocket! 🚀\n${shareLink}`;
                                const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`;
                                window.open(threadsUrl, "_blank");
                              }}
                              className="flex h-12 w-12 items-center justify-center rounded-full bg-black transition-transform hover:scale-110"
                              aria-label="Share on Threads"
                            >
                              <SiThreads className="h-6 w-6 text-white" />
                            </button>
                            <span className="text-xs text-white">Threads</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-border border-t pt-4">
                        <p className="mb-3 text-sm font-medium text-white">
                          Or copy the link:
                        </p>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="text"
                            value={shareLink}
                            readOnly
                            className="flex-1"
                          />
                          <Button
                            onClick={() => {
                              copy(shareLink);
                              toast({
                                variant: "default",
                                title: "Link copied",
                                description:
                                  "The URL has been successfully copied to your clipboard",
                                duration: 3000,
                              });
                            }}
                            size="sm"
                          >
                            <Copy className="size-4" />
                            <span className="sr-only">Copy</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    {lastAssistantMessage?.screenshot && (
                      <img
                        src={lastAssistantMessage.screenshot}
                        alt={
                          fetchedChat?.title
                            ? `${fetchedChat.title} preview`
                            : "Component preview"
                        }
                        className="border-border flex items-center rounded-lg border h-auto w-full"
                      />
                    )}
                  </div>
                )}
              </DialogDescription>
            </DialogContent>
          </Dialog>
          <Dialog open={isRemixModalOpen} onOpenChange={setIsRemixModalOpen}>
            <DialogContent className="max-w-md sm:max-w-2xl">
              <div className="mb-6 flex flex-col items-center justify-center text-center">
                <GitFork className="text-primary mb-2 size-12" />
                <DialogTitle className="text-xl font-semibold">
                  Remix This Component
                </DialogTitle>
                <p className="text-muted-foreground">
                  Create your own version of this component! 🚀
                </p>
              </div>
              <DialogDescription>
                <>
                  <p className="mb-4">
                    Remixing will create a copy of this component that you can
                    modify and customize. This feature is available for
                    subscribers only.
                  </p>
                  {hasAlreadyRemixed && remixOriginalChat && (
                    <Alert className="mb-4">
                      <AlertTitle className="mb-2 flex items-center gap-2">
                        <Info className="size-4" />
                        <p>This is a remix</p>
                      </AlertTitle>
                      <AlertDescription>
                        This component is a remix of{" "}
                        <a
                          href={`/components/${remixOriginalChat.slug}`}
                          className="text-primary font-medium hover:underline"
                        >
                          {remixOriginalChat.title ||
                            `Component ${remixOriginalChat.slug}`}
                        </a>
                        . You can remix it again to create your own version.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Alert className="mb-4">
                    <AlertTitle className="mb-2 flex items-center gap-2">
                      <Info className="size-4" />{" "}
                      <p>Remixing from selected version</p>
                    </AlertTitle>
                    <AlertDescription>
                      You selected{" "}
                      <Badge variant="outline">
                        version #{selectedVersion}
                      </Badge>{" "}
                      as the base of your remix. You can change this by
                      selecting a different version in the sidebar.
                    </AlertDescription>
                  </Alert>
                </>
                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      handleRemixClick();
                    }}
                    disabled={isRemixing}
                    className="flex w-full max-w-xs items-center justify-center"
                  >
                    {isRemixing ? (
                      <>
                        <Loader className="size-4 animate-spin" />
                        Creating Remix...
                      </>
                    ) : (
                      <>
                        <GitFork className="size-4" />
                        Remix Component
                      </>
                    )}
                  </Button>
                </div>
              </DialogDescription>
            </DialogContent>
          </Dialog>
        </Container>
      </BuilderProvider>
    </ComponentContext.Provider>
  );
}
