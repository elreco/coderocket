"use client";

import { useCompletion } from "@ai-sdk/react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { useCopyToClipboard } from "usehooks-ts";

import { getSubscription } from "@/app/supabase-server";
import { ClonedUrlBadge } from "@/components/cloned-url-badge";
import { Container } from "@/components/container";
import { RemixOriginalBadge } from "@/components/remix-original-badge";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { BuilderProvider } from "@/context/builder-context";
import {
  ChatMessage,
  ComponentContext,
  WebcontainerLoadingState,
  SelectedElementData,
} from "@/context/component-context";
import { useToast } from "@/hooks/use-toast";
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

import { buildComponent } from "./actions";
import CodePreview from "./code-preview";
import ComponentSidebar from "./component-sidebar";
import { ComponentHeader } from "./components/component-header";
import { PreviewToolbar } from "./components/preview-toolbar";
import { RemixModal } from "./components/remix-modal";
import { ShareModal } from "./components/share-modal";
import { usePreviewNavigation } from "./hooks/use-preview-navigation";
import { useRealtimeSync } from "./hooks/use-realtime-sync";

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
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);

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
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);

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
  const [isResuming, setIsResuming] = useState(false);
  const hasAttemptedResumeRef = useRef<Record<string, boolean>>({});

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

  const {
    previewPath,
    setPreviewPath,
    addressBarValue,
    setAddressBarValue,
    addressFocused,
    setAddressFocused,
    breakpoint,
    setBreakpoint,
    addressInputRef,
    isHtmlFrameworkSelected,
    previewPathSuffix,
    sharePathSuffix,
    canGoBack,
    canGoForward,
    isNavigationEnabled,
    navigationPlaceholder,
    navigatePreview,
    syncPreviewPath,
    handleGoBack,
    handleGoForward,
    handleAddressSubmit,
    setIgnoreNextRootRoute,
  } = usePreviewNavigation({
    chatId,
    framework: (fetchedChat?.framework as Framework) || null,
    selectedVersion,
    isWebcontainerReady,
    isLoading,
    isLengthError,
    artifactFilesCount: artifactFiles.length,
  });

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

      const loadAdditionalData = async () => {
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
          console.error("Error loading additional data:", error);
        }
      };

      loadAdditionalData();

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

  const setCompletionRef = useRef<((value: string) => void) | null>(null);
  const setInputRef = useRef<((value: string) => void) | null>(null);
  const refreshChatDataRef = useRef<
    (() => Promise<ChatMessage[] | undefined>) | null
  >(null);
  const tryResumeStream = useCallback(async (): Promise<boolean> => {
    if (hasAttemptedResumeRef.current[chatId]) {
      return false;
    }
    hasAttemptedResumeRef.current[chatId] = true;

    try {
      const response = await fetch(`/api/components/${chatId}/stream`);
      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();

        if (data.needsBuild && data.version !== null) {
          try {
            await buildComponent(chatId, data.version, true);
            if (refreshChatDataRef.current) {
              await refreshChatDataRef.current();
            }
            return true;
          } catch {
            return false;
          }
        }
        return false;
      }

      if (!response.ok) {
        return false;
      }

      setIsResuming(true);
      setIsLoading(true);
      setCanvas(true);

      const reader = response.body?.getReader();
      if (!reader) {
        setIsResuming(false);
        return false;
      }

      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        if (setCompletionRef.current) {
          setCompletionRef.current(accumulatedText);
        }
      }

      setIsResuming(false);
      setIsLoading(false);
      setIsSubmitting(false);
      if (setInputRef.current) {
        setInputRef.current("");
      }

      if (refreshChatDataRef.current) {
        const refreshedMessages = await refreshChatDataRef.current();

        if (refreshedMessages) {
          const lastAssistant = refreshedMessages
            .filter((m) => m.role === "assistant")
            .sort((a, b) => b.version - a.version)[0];

          if (lastAssistant && !lastAssistant.is_built) {
            try {
              await buildComponent(chatId, lastAssistant.version, true);
            } catch {
              // Build failed silently
            }
          }
        }
      }

      return true;
    } catch {
      setIsResuming(false);
      return false;
    }
  }, [chatId]);

  const startInitialGenerationRef = useRef<((prompt: string) => void) | null>(
    null,
  );

  useEffect(() => {
    if (!fetchedChat || !messages.length) return;

    const lastUserMsg = messages.find(
      (m) => m.role === "user" && m.version === selectedVersion,
    );
    const lastAssistantMsg = messages.find(
      (m) => m.role === "assistant" && m.version === selectedVersion,
    );

    const needsGeneration =
      messages.length === 1 && lastUserMsg && !lastAssistantMsg;

    const isIncomplete =
      lastAssistantMsg?.content &&
      !lastAssistantMsg.content.includes("<!-- FINISH_REASON:");

    if (!needsGeneration && !isIncomplete) return;
    if (hasInitiatedRef.current[chatId]) return;

    hasInitiatedRef.current[chatId] = true;

    const attemptResumeOrStart = async () => {
      const resumed = await tryResumeStream();

      if (!resumed && needsGeneration && startInitialGenerationRef.current) {
        setIsLoading(true);
        setIsSubmitting(true);
        const isFirstVersion = (lastUserMsg?.version ?? 0) <= 0;
        if (fetchedChat.clone_url && isFirstVersion) {
          setIsScrapingWebsite(true);
        }
        startInitialGenerationRef.current(lastUserMsg?.content || "");
      }
    };

    attemptResumeOrStart();
  }, [chatId, fetchedChat, messages, selectedVersion, tryResumeStream]);

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
          // Marquer la fin du streaming AVANT de rafraîchir les données
          setIsStreamingComplete(true);
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

          // Vider le completion APRES le refresh pour éviter le flash
          setCompletion("");
          setIsStreamingComplete(false);
          setInput("");
          setIsLoading(false);
          setCanvas(true);
          setUploadFiles([]);
        } catch (error) {
          console.error("Error in onFinish:", error);
          setIsStreamingComplete(false);
          setIsLoading(false);
          setIsSubmitting(false);
          setCanvas(true);
        }
      },
    });

  useEffect(() => {
    startInitialGenerationRef.current = complete;
    setCompletionRef.current = setCompletion;
    setInputRef.current = setInput;
  }, [complete, setCompletion, setInput]);

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
            try {
              const newArtifactCode = getUpdatedArtifactCode(
                completion,
                prevArtifactCode,
              );

              if (
                !newArtifactCode ||
                newArtifactCode.trim() === "" ||
                !newArtifactCode.includes("<coderocketArtifact")
              ) {
                console.error(
                  "[Patch] Generated invalid artifact code in frontend. Preserving previous state.",
                );
                return prevArtifactCode;
              }

              const newFiles = extractFilesFromArtifact(
                newArtifactCode,
                prevArtifactCode,
                completion,
              );

              if (newFiles.length > 0) {
                setArtifactFiles((prevFiles) => {
                  const fileMap = new Map(prevFiles.map((f) => [f.name, f]));
                  newFiles.forEach((file) => {
                    if (file.name && file.content !== undefined) {
                      fileMap.set(file.name, file);
                    }
                  });
                  return Array.from(fileMap.values());
                });

                const activeFile = newFiles.find(
                  (f) => f.name === lastFileName,
                );
                if (activeFile && activeFile.content !== undefined) {
                  setEditorValue(activeFile.content);
                }
              }

              return newArtifactCode;
            } catch (error) {
              console.error(
                "[Patch] Error updating artifact code in frontend:",
                error instanceof Error ? error.message : String(error),
              );
              console.error(
                "[Patch] Preserving previous artifact code to prevent corruption.",
              );
              return prevArtifactCode;
            }
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

  useEffect(() => {
    refreshChatDataRef.current = refreshChatData;
  }, [refreshChatData]);

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

  const handleMessagesUpdate = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessages(updater);
    },
    [],
  );

  const handleMessagesDelete = useCallback((messageId: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const handleTitleUpdate = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  useRealtimeSync({
    chatId,
    connectedUserId: connectedUser?.id,
    selectedVersion,
    isLoading,
    fetchedChat,
    title,
    selectedVersionRef,
    onMessagesUpdate: handleMessagesUpdate,
    onMessagesDelete: handleMessagesDelete,
    onChatUpdate: setFetchedChat,
    onLikesCountUpdate: setLikesCount,
    onTitleUpdate: handleTitleUpdate,
    onVisibilityUpdate: setVisible,
    onCustomDomainUpdate: setCustomDomain,
    onSubscriptionUpdate: setSubscription,
    onGithubConnectionUpdate: setGithubConnection,
    onSelectedVersionUpdate: setSelectedVersion,
    onWebcontainerReadyUpdate: setWebcontainerReady,
    onForceBuildUpdate: setForceBuild,
    onLastAssistantMessageUpdate: setLastAssistantMessage,
  });

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
    isStreamingComplete,
    isResuming,
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

  return (
    <ComponentContext.Provider value={contextValue}>
      <BuilderProvider>
        <Container className="p-0! lg:overflow-hidden">
          <div className="grid size-full max-h-full grid-cols-1 justify-center xl:grid-cols-4 xl:flex-row">
            <div className="col-span-1 flex size-full min-h-full flex-col xl:col-span-3 xl:mb-0">
              <ComponentHeader
                title={title}
                isLiked={isLiked}
                likesCount={likesCount}
                isRemixing={isRemixing}
                customDomain={customDomain}
                onShare={share}
                onRemixClick={() => setIsRemixModalOpen(true)}
                onLikeClick={handleLikeClick}
                onShareModalOpen={() => setIsShareModalOpen(true)}
              />
              {isCanvas && (
                <PreviewToolbar
                  isHtmlFrameworkSelected={isHtmlFrameworkSelected}
                  sharePathSuffix={sharePathSuffix}
                  previewPathSuffix={previewPathSuffix}
                  canGoBack={canGoBack}
                  canGoForward={canGoForward}
                  isNavigationEnabled={isNavigationEnabled}
                  navigationPlaceholder={navigationPlaceholder}
                  addressFocused={addressFocused}
                  addressInputRef={addressInputRef}
                  isModalOpen={isModalOpen}
                  loadingState={loadingState}
                  onSetAddressFocused={setAddressFocused}
                  onHandleGoBack={handleGoBack}
                  onHandleGoForward={handleGoForward}
                  onHandleAddressSubmit={handleAddressSubmit}
                  onSetIgnoreNextRootRoute={setIgnoreNextRootRoute}
                  onSetIframeKey={setIframeKey}
                  onSetIsModalOpen={setIsModalOpen}
                  onHandleFullscreenToggle={handleFullscreenToggle}
                />
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
          <ShareModal
            isOpen={isShareModalOpen}
            onOpenChange={setIsShareModalOpen}
            isVisible={isVisible}
            shareLink={shareLink}
            fetchedChat={fetchedChat}
            lastAssistantMessage={lastAssistantMessage}
            onCopy={copy}
          />
          <RemixModal
            isOpen={isRemixModalOpen}
            onOpenChange={setIsRemixModalOpen}
            selectedVersion={selectedVersion}
            isRemixing={isRemixing}
            hasAlreadyRemixed={hasAlreadyRemixed}
            remixOriginalChat={remixOriginalChat}
            onRemixClick={handleRemixClick}
          />
        </Container>
      </BuilderProvider>
    </ComponentContext.Provider>
  );
}
