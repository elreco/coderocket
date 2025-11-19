"use client";

import { useCompletion } from "@ai-sdk/react";
import { SiThreads } from "@icons-pack/react-simple-icons";
import { Crisp } from "crisp-sdk-web";
import { format } from "date-fns";
import { motion } from "framer-motion";
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
  X,
  Heart,
  Info,
  Share,
  Rocket,
  Monitor,
  Tablet,
  Smartphone,
  ArrowLeft,
  ArrowRight,
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
import {
  Framework,
  MAX_VERSIONS_PER_COMPONENT,
  crispWebsiteId,
} from "@/utils/config";
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
}

export default function ComponentCompletion({
  chatId,
  authorized,
  user,
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
  const [addressBarValue, setAddressBarValue] = useState("/");
  const [navigationHistory, setNavigationHistory] = useState<string[]>(["/"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const [addressFocused, setAddressFocused] = useState(false);

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
    if (nextPath.includes("#")) {
      nextPath = nextPath.split("#")[0];
    }
    nextPath = nextPath.replace(/\/+/g, "/");
    if (nextPath.length > 1 && nextPath.endsWith("/")) {
      nextPath = nextPath.slice(0, -1);
    }
    return nextPath || "/";
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

  const [artifactCode, setArtifactCode] = useState("");

  const [activeTab, setActiveTab] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [forceBuild, setForceBuild] = useState(false);
  const [isLengthError, setIsLengthError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fetchedChat, setFetchedChat] = useState<Tables<"chats"> | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] =
    useState<Tables<"messages"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isLiked, setIsLiked] = useState(false);

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
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  useEffect(() => {
    const initialPath = "/";
    setPreviewPath(initialPath);
    setAddressBarValue(initialPath);
    setNavigationHistory([initialPath]);
    setHistoryIndex(0);
    historyIndexRef.current = 0;
  }, [chatId, selectedVersion, fetchedChat?.framework]);

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
    const checkUserAuth = async () => {
      const { data } = await supabase.auth.getUser();
      setIsUserLoggedIn(!!data?.user);
    };
    checkUserAuth();
  }, [supabase]);

  useEffect(() => {
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
      setLastAssistantMessage(assistantMsg || null);
      setMessages(msgs as ChatMessage[]);
      setSelectedVersion(userMsg?.version || 0);

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
              const { data: authData } = await supabase.auth.getUser();
              const loggedInUserId = authData?.user?.id;

              if (!loggedInUserId) {
                return null;
              }

              const { data } = await supabase
                .from("subscriptions")
                .select("*, prices(*, products(*))")
                .in("status", ["trialing", "active"])
                .eq("user_id", loggedInUserId)
                .maybeSingle();
              return data;
            } catch {
              return null;
            }
          })();

          const githubPromise = (async () => {
            try {
              const { data: authData } = await supabase.auth.getUser();
              const loggedInUserId = authData?.user?.id;

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
  }, [chatId]);

  const { completion, stop, complete, setCompletion, input, setInput } =
    useCompletion({
      api: "/api/components",
      fetch: async (url, options) => {
        const requestBody = JSON.parse((options?.body as string) || "{}");
        const promptValue = requestBody.prompt || input;

        const currentFiles = uploadFilesRef.current;

        const formData = new FormData();
        currentFiles.forEach((file) => {
          formData.append("files", file);
        });
        formData.append("id", chatId);
        formData.append("selectedVersion", String(selectedVersion));
        formData.append("prompt", promptValue);

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
        if (error.message === "more-than-x-versions") {
          toast({
            variant: "destructive",
            title: `You can't have more than ${MAX_VERSIONS_PER_COMPONENT} versions`,
            description: "Please remix your component instead.",
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
          const subscription = await getSubscription();
          if (!subscription) {
            // Utiliser le premier jour du mois en cours comme période de départ
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

    const newVersion = (selectedVersion ?? 0) + 1;
    setSelectedVersion(newVersion);

    complete(inputData);
    setIsLoading(true);
  };

  const handleVersionSelect = (version: number, tabName?: string) => {
    // If we're just changing tabs on the same version, don't trigger a rebuild
    const isTabChangeOnly = version === selectedVersion && tabName;

    if (!isTabChangeOnly) {
      setSelectedVersion(version);
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

  const refreshChat = async () => {
    const refreshedChat = await fetchChatById(chatId);
    if (!refreshedChat) return;
    setFetchedChat(refreshedChat);
  };

  const refreshChatData = async () => {
    const refreshedChatMessages = await fetchMessagesByChatId(chatId, false);
    if (!refreshedChatMessages) return;
    setMessages(refreshedChatMessages);
    const refreshedChat = await fetchChatById(chatId);
    if (!refreshedChat) return;
    setFetchedChat(refreshedChat);
    // Always get artifact code from the selected version, not from chats table
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
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) return null;

            const { data } = await supabase
              .from("subscriptions")
              .select("*, prices(*, products(*))")
              .in("status", ["trialing", "active"])
              .eq("user_id", userData.user.id)
              .maybeSingle();
            return data;
          } catch {
            return null;
          }
        })();

        const githubPromise = (async () => {
          try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) return null;

            const { data } = await supabase
              .from("github_connections")
              .select("*")
              .eq("user_id", userData.user.id)
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
  };

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
    Crisp.configure(crispWebsiteId);

    if (isModalOpen) {
      Crisp.chat.hide();
    }
  }, [isModalOpen]);

  const handleFullscreenToggle = (isOpen: boolean) => {
    setIsModalOpen(isOpen);
  };

  const handleLikeClick = async () => {
    const { data: user, error } = await supabase.auth.getUser();

    if (error || !user) {
      toast({
        title: "Can't like component",
        description: "Please login to like a component",
        duration: 4000,
      });
      return;
    }

    setIsLiked(!isLiked);
    toggleChatLike(chatId);
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
  };

  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
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
            const updatedMessages = prevMessages.map((message) =>
              message.id === payload.new.id
                ? { ...message, ...payload.new }
                : message,
            );
            return updatedMessages;
          });

          if (
            (payload.old.version === -1 || payload.old.version === undefined) &&
            payload.new.version === 0
          ) {
            setSelectedVersion(0);
          }

          if (
            payload.new.version === selectedVersion &&
            payload.new.is_built === true &&
            !isLoading
          ) {
            setWebcontainerReady(true);
            setForceBuild(false);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [chatId, selectedVersion, isLoading]);

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
                          if (!isVisible || isLoading || isLengthError) {
                            return;
                          }
                          share();
                        }}
                        disabled={!isVisible || isLoading || isLengthError}
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
                    {(isWebcontainerReady ||
                      fetchedChat?.framework === Framework.HTML) && (
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
                            disabled={isLoading || isLengthError}
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
                    )}
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
                          onClick={() => setIframeKey((prev) => prev + 1)}
                          disabled={
                            isLoading ||
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
                              sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
                              allow="credentialless"
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
                  <div className="absolute right-0 bottom-0 z-9000 flex w-full items-center justify-end gap-2 p-2">
                    {fetchedChat?.clone_url && (
                      <ClonedUrlBadge
                        url={fetchedChat.clone_url}
                        showTooltip={true}
                      />
                    )}
                    {remixOriginalChat && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`/components/${remixOriginalChat.slug}`}
                              className="flex items-center gap-1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <GitFork className="size-4" />
                              {remixOriginalChat.title ||
                                `Component ${remixOriginalChat.slug}`}
                              <ExternalLink className="size-3" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            This component is a remix of this original component
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileTap={{ scale: 0.9, rotate: 15 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Button
                            onClick={handleLikeClick}
                            variant="secondary"
                            size="sm"
                            className={`ml-2 flex items-center border-none gap-1 rounded-full p-2 shadow-md transition-colors ${
                              isLiked
                                ? "bg-primary text-secondary hover:bg-primary"
                                : "bg-pink-500 text-pink-300 hover:bg-pink-400"
                            }`}
                          >
                            <Heart className="size-5" />
                            <span>{isLiked ? "Unlike" : "Like"}</span>
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isLiked
                            ? "Remove from liked components"
                            : "Add to liked components"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
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
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              </DialogDescription>
            </DialogContent>
          </Dialog>
          <Dialog open={isRemixModalOpen} onOpenChange={setIsRemixModalOpen}>
            <DialogContent className="max-w-md sm:max-w-2xl">
              <div className="mb-6 flex flex-col items-center justify-center text-center">
                <GitFork className="text-primary mb-2 size-12" />
                <DialogTitle className="text-xl font-semibold">
                  {hasAlreadyRemixed
                    ? "Already Remixed"
                    : "Remix This Component"}
                </DialogTitle>
                <p className="text-muted-foreground">
                  {hasAlreadyRemixed
                    ? "This component is already remixed"
                    : "Create your own version of this component! 🚀"}
                </p>
              </div>
              <DialogDescription>
                {hasAlreadyRemixed ? (
                  <div className="mb-4">
                    {remixOriginalChat && (
                      <div className="bg-secondary rounded-md p-4">
                        <p className="mb-2 font-medium">Want to try again?</p>
                        <p className="mb-4">
                          You can go back to the original component that was
                          used as the base for this remix and create a new remix
                          from there:
                        </p>
                        <div className="bg-background flex flex-col items-start gap-2 rounded-md p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <GitFork className="text-primary size-4" />
                            <span>Original component:</span>
                          </div>
                          <a
                            href={`/components/${remixOriginalChat.slug}`}
                            className="text-primary flex items-center gap-1 font-medium hover:underline"
                          >
                            {remixOriginalChat.title ||
                              `Component ${remixOriginalChat.slug}`}
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="mb-4">
                      Remixing will create a copy of this component that you can
                      modify and customize. This feature is available for
                      subscribers only.
                    </p>
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
                )}
                <div className="flex justify-center">
                  {hasAlreadyRemixed ? (
                    <Button
                      onClick={() => setIsRemixModalOpen(false)}
                      className="flex w-full max-w-xs items-center justify-center"
                    >
                      <X className="size-4" />
                      <span>Close</span>
                    </Button>
                  ) : (
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
                  )}
                </div>
              </DialogDescription>
            </DialogContent>
          </Dialog>
        </Container>
      </BuilderProvider>
    </ComponentContext.Provider>
  );
}
