"use client";

import { Loader2, AlertCircle, RefreshCw, WandSparkles } from "lucide-react";
import React from "react";

import { ElementSelector } from "@/components/element-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBuilder } from "@/context/builder-context";
import {
  useComponentContext,
  WebcontainerLoadingState,
} from "@/context/component-context";
import { cn } from "@/lib/utils";
import { createContinuePrompt } from "@/utils/completion-parser";
import { FREE_CHAR_LIMIT } from "@/utils/config";
import { createClient } from "@/utils/supabase/client";

import { ComponentLoadingMockup } from "./component-loading-mockup";

function LoadingStateComponent({
  state,
  customTitle,
  customDescription,
}: {
  state: WebcontainerLoadingState;
  customTitle?: string;
  customDescription?: string;
}) {
  const { setInput, handleSubmitToAI, authorized, messages } =
    useComponentContext();

  const handleContinueGeneration = () => {
    const continuePrompt = createContinuePrompt(messages);
    setInput(continuePrompt);
    handleSubmitToAI(continuePrompt);
  };

  if (state === "token-limit") {
    return (
      <div className="flex size-full flex-col items-center justify-center space-y-4 p-8 text-center">
        <div className="text-primary dark:text-primary flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-violet-900/20">
          <RefreshCw className="size-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-xl font-semibold">Generation in progress</h3>
          <p className="text-muted-foreground text-sm">
            The AI has reached its token limit, but don&apos;t worry! This is
            completely normal when creating complex projects. The project is on
            the right track!
          </p>
          {authorized && (
            <Button className="mt-4" onClick={handleContinueGeneration}>
              <RefreshCw className="mr-2 size-4" />
              Continue generation
            </Button>
          )}
        </div>
      </div>
    );
  }

  const title =
    customTitle ||
    (state === "initializing" && "Initializing WebContainer...") ||
    (state === "deploying" && "Deploying application...") ||
    (state === "processing" && "Processing application...") ||
    (state === "starting" && "Starting application...") ||
    "";

  const description =
    customDescription ||
    (state === "initializing" && "Setting up development environment.") ||
    (state === "deploying" && "It may take a few minutes.") ||
    (state === "processing" && "Analyzing and generating component.") ||
    (state === "starting" && "One moment, application is starting.") ||
    "";

  return (
    <div className="flex size-full flex-col items-center justify-center space-y-4 p-8 text-center">
      <Loader2 className="text-primary size-8 animate-spin" />
      <div className="space-y-2">
        {title && <h3 className="font-semibold">{title}</h3>}
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
    </div>
  );
}

export default function ComponentPreview() {
  const { loadingState, buildError, setLoadingState } = useBuilder();
  const {
    chatId,
    selectedVersion,
    isLoading,
    authorized,
    setInput,
    isWebcontainerReady,
    handleSubmitToAI,
    breakpoint,
    previewPath,
    syncPreviewPath,
    isLengthError,
    isScrapingWebsite,
    isContinuingFromLengthError,
    isElementSelectionActive,
    iframeKey,
    completion,
    isStreamingComplete,
  } = useComponentContext();
  const [hasEverLoaded, setHasEverLoaded] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const startingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (loadingState === "starting" && !hasEverLoaded) {
      startingTimeoutRef.current = setTimeout(() => {
        if (!hasEverLoaded) {
          setLoadingState(null);
        }
      }, 10000);
    }

    return () => {
      if (startingTimeoutRef.current) {
        clearTimeout(startingTimeoutRef.current);
        startingTimeoutRef.current = null;
      }
    };
  }, [loadingState, hasEverLoaded, setLoadingState, selectedVersion]);

  const getInitialDisplayVersion = () => {
    if (selectedVersion === undefined) return undefined;
    // Pour la première version, ne pas définir displayVersion initialement
    // Il sera défini plus tard quand la version sera prête
    if (selectedVersion === 0) {
      return undefined;
    }
    // On initialise toujours à selectedVersion au chargement pour éviter le flickering
    // L'effet se chargera de le changer si nécessaire
    return selectedVersion;
  };

  const [displayVersion, setDisplayVersion] = React.useState<
    number | undefined
  >(getInitialDisplayVersion);
  const [previousVersionHasError, setPreviousVersionHasError] =
    React.useState(false);
  const [previousVersionIsBuilt, setPreviousVersionIsBuilt] =
    React.useState(false);
  const [currentVersionIsBuilt, setCurrentVersionIsBuilt] =
    React.useState(false);

  // Calculer isFirstGeneration avant les useEffects
  const isFirstGeneration =
    selectedVersion === 0 ||
    selectedVersion === -1 ||
    selectedVersion === undefined;

  // Reset hasEverLoaded when selectedVersion changes
  React.useEffect(() => {
    setHasEverLoaded(false);
    setCurrentVersionIsBuilt(false);
  }, [selectedVersion]);

  // Réinitialiser displayVersion à undefined quand on commence le scraping de la première version
  React.useEffect(() => {
    if (
      isScrapingWebsite &&
      (selectedVersion === 0 ||
        selectedVersion === -1 ||
        selectedVersion === undefined)
    ) {
      setDisplayVersion(undefined);
      setPreviousVersionHasError(false);
      setPreviousVersionIsBuilt(false);
    }
  }, [isScrapingWebsite, selectedVersion]);

  React.useEffect(() => {
    if (selectedVersion === undefined || selectedVersion <= 0) {
      setPreviousVersionIsBuilt(false);
      return;
    }

    let isMounted = true;
    const prevVersion = selectedVersion - 1;
    const supabase = createClient();

    void (async () => {
      try {
        const { data } = await supabase
          .from("messages")
          .select("is_built")
          .eq("chat_id", chatId)
          .eq("role", "assistant")
          .eq("version", prevVersion)
          .single();
        if (isMounted) {
          setPreviousVersionIsBuilt(data?.is_built === true);
        }
      } catch {
        if (isMounted) {
          setPreviousVersionIsBuilt(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedVersion, chatId]);

  React.useEffect(() => {
    if (selectedVersion === undefined) return;

    let isMounted = true;
    const isGenerating =
      isLoading || (loadingState && loadingState !== "error");

    if (
      isScrapingWebsite &&
      (selectedVersion === 0 ||
        selectedVersion === -1 ||
        selectedVersion === undefined)
    ) {
      if (displayVersion !== undefined) {
        setDisplayVersion(undefined);
      }
      return;
    }

    if (
      displayVersion === undefined ||
      (selectedVersion > 0 &&
        displayVersion !== selectedVersion &&
        displayVersion !== selectedVersion - 1) ||
      (selectedVersion > 0 && displayVersion === selectedVersion && isLoading)
    ) {
      if (selectedVersion > 0) {
        const supabase = createClient();
        supabase
          .from("messages")
          .select("is_built")
          .eq("chat_id", chatId)
          .eq("role", "assistant")
          .eq("version", selectedVersion)
          .single()
          .then(({ data: currentData }) => {
            if (!isMounted) return;

            const currentIsBuilt = currentData?.is_built === true;
            setCurrentVersionIsBuilt(currentIsBuilt);

            if (currentIsBuilt && !isGenerating) {
              setDisplayVersion(selectedVersion);
              setPreviousVersionHasError(false);
            } else {
              const prevVersion = selectedVersion - 1;
              supabase
                .from("messages")
                .select("build_error, content, is_built")
                .eq("chat_id", chatId)
                .eq("role", "assistant")
                .eq("version", prevVersion)
                .single()
                .then(({ data }) => {
                  if (!isMounted) return;

                  const hasError =
                    data?.build_error ||
                    data?.content?.includes("<!-- FINISH_REASON: length -->") ||
                    data?.content?.includes("<!-- FINISH_REASON: error -->");
                  setPreviousVersionHasError(!!hasError);
                  const isBuilt = data?.is_built === true;
                  setPreviousVersionIsBuilt(isBuilt);

                  if (isBuilt) {
                    setDisplayVersion(prevVersion);
                  } else if (currentIsBuilt) {
                    setDisplayVersion(selectedVersion);
                  }
                });
            }
          });
      }
    } else if (
      !isLoading &&
      !isScrapingWebsite &&
      displayVersion !== selectedVersion &&
      !isFirstGeneration &&
      isWebcontainerReady &&
      loadingState !== "error" &&
      (loadingState === null || loadingState === "starting")
    ) {
      setDisplayVersion(selectedVersion);
      setPreviousVersionHasError(false);
    }

    return () => {
      isMounted = false;
    };
  }, [
    isLoading,
    selectedVersion,
    displayVersion,
    loadingState,
    isWebcontainerReady,
    chatId,
    isScrapingWebsite,
    isFirstGeneration,
  ]);

  React.useEffect(() => {
    const handleRouteMessage = (event: MessageEvent) => {
      if (
        !event.data ||
        typeof event.data !== "object" ||
        event.data.type !== "coderocket-route-change"
      ) {
        return;
      }

      const path = (event.data as { path?: string }).path;
      if (typeof path !== "string") {
        return;
      }

      if (event.origin && event.origin !== "null") {
        try {
          const originHost = new URL(event.origin).hostname;
          const allowedHosts = [
            "preview.coderocket.app",
            "webcontainer.coderocket.app",
          ];
          const isAllowed = allowedHosts.some(
            (host) => originHost === host || originHost.endsWith(`.${host}`),
          );
          if (!isAllowed) {
            return;
          }
        } catch {
          // Ignore URL parsing errors and accept the message
        }
      }

      syncPreviewPath(path);
    };

    window.addEventListener("message", handleRouteMessage);
    return () => {
      window.removeEventListener("message", handleRouteMessage);
    };
  }, [syncPreviewPath]);
  const isGenerating = isLoading || (loadingState && loadingState !== "error");
  const isCorrectionInProgress =
    buildError &&
    (isLoading ||
      (loadingState && loadingState !== "error" && loadingState !== null));

  const isScrapingFirstVersion = React.useMemo(
    () =>
      isScrapingWebsite &&
      (selectedVersion === 0 ||
        selectedVersion === -1 ||
        selectedVersion === undefined),
    [isScrapingWebsite, selectedVersion],
  );

  const shouldShowLoaderFirstGen = React.useMemo(
    () =>
      isScrapingFirstVersion ||
      (!isScrapingWebsite && isContinuingFromLengthError) ||
      (!isScrapingWebsite &&
        isFirstGeneration &&
        isLoading &&
        !isStreamingComplete) ||
      (!isScrapingWebsite &&
        isFirstGeneration &&
        !isLoading &&
        displayVersion === undefined &&
        loadingState !== "error") ||
      (!isScrapingWebsite &&
        isFirstGeneration &&
        (loadingState === "starting" ||
          (loadingState === null && isWebcontainerReady)) &&
        displayVersion === undefined &&
        !hasEverLoaded) ||
      (!isScrapingWebsite && isLengthError && isGenerating),
    [
      isScrapingFirstVersion,
      isScrapingWebsite,
      isContinuingFromLengthError,
      isFirstGeneration,
      isLoading,
      isStreamingComplete,
      displayVersion,
      loadingState,
      isWebcontainerReady,
      hasEverLoaded,
      isLengthError,
      isGenerating,
    ],
  );

  const shouldShowLoaderSubsequentGen = React.useMemo(
    () =>
      !isScrapingWebsite &&
      !isFirstGeneration &&
      isGenerating &&
      !previousVersionIsBuilt &&
      (previousVersionHasError || displayVersion === undefined),
    [
      isScrapingWebsite,
      isFirstGeneration,
      isGenerating,
      previousVersionIsBuilt,
      previousVersionHasError,
      displayVersion,
    ],
  );

  const shouldShowLoaderFix = React.useMemo(
    () =>
      isCorrectionInProgress &&
      !previousVersionIsBuilt &&
      displayVersion === undefined,
    [isCorrectionInProgress, previousVersionIsBuilt, displayVersion],
  );

  const shouldShowLoader = React.useMemo(
    () =>
      shouldShowLoaderFirstGen ||
      shouldShowLoaderSubsequentGen ||
      shouldShowLoaderFix,
    [
      shouldShowLoaderFirstGen,
      shouldShowLoaderSubsequentGen,
      shouldShowLoaderFix,
    ],
  );

  const shouldUseMockupLoader = React.useMemo(
    () =>
      (isFirstGeneration && isLoading && !isStreamingComplete) ||
      isScrapingFirstVersion ||
      (!isFirstGeneration &&
        isGenerating &&
        !previousVersionIsBuilt &&
        (previousVersionHasError || displayVersion === undefined) &&
        isLoading &&
        !isStreamingComplete) ||
      (isCorrectionInProgress &&
        !previousVersionIsBuilt &&
        isLoading &&
        !isStreamingComplete) ||
      (isLengthError && isGenerating && isLoading && !isStreamingComplete) ||
      (isContinuingFromLengthError && isLoading && !isStreamingComplete),
    [
      isFirstGeneration,
      isLoading,
      isStreamingComplete,
      isScrapingFirstVersion,
      isGenerating,
      previousVersionIsBuilt,
      previousVersionHasError,
      displayVersion,
      isCorrectionInProgress,
      isLengthError,
      isContinuingFromLengthError,
    ],
  );

  // Forcer displayVersion à undefined pendant le scraping de la première version
  React.useEffect(() => {
    if (
      isScrapingWebsite &&
      (selectedVersion === 0 ||
        selectedVersion === -1 ||
        selectedVersion === undefined) &&
      displayVersion !== undefined
    ) {
      setDisplayVersion(undefined);
      setPreviousVersionHasError(false);
      setPreviousVersionIsBuilt(false);
    }
  }, [isScrapingWebsite, selectedVersion, displayVersion]);
  const hasActiveGeneration = completion.length > 0;

  const shouldShowBadge = React.useMemo(
    () =>
      !isFirstGeneration &&
      !isLengthError &&
      !buildError &&
      previousVersionIsBuilt &&
      !currentVersionIsBuilt &&
      displayVersion !== undefined &&
      displayVersion !== selectedVersion &&
      ((isLoading && hasActiveGeneration) || loadingState === "processing"),
    [
      isFirstGeneration,
      isLengthError,
      buildError,
      previousVersionIsBuilt,
      currentVersionIsBuilt,
      displayVersion,
      selectedVersion,
      isLoading,
      hasActiveGeneration,
      loadingState,
    ],
  );
  const previewPathSuffix = previewPath === "/" ? "" : previewPath;

  // Déterminer le message personnalisé pour le loader fullscreen
  const getLoaderCustomTitle = () => {
    // Cas 1 - Première génération
    // "Building version #" après le stream, avant ou pendant le build
    if (
      isFirstGeneration &&
      !isLoading &&
      displayVersion === undefined &&
      (loadingState === "processing" || loadingState === null)
    ) {
      return `Building version ${selectedVersion}...`;
    }
    // "Starting version #" quand le build est terminé et l'iframe commence
    if (
      isFirstGeneration &&
      !isLoading &&
      (loadingState === "starting" ||
        (loadingState === null && isWebcontainerReady)) &&
      displayVersion === undefined &&
      !hasEverLoaded
    ) {
      return `Starting version ${selectedVersion}...`;
    }
    // Cas 3 - Fix sans version précédente buildée (se comporte comme première génération)
    if (
      isCorrectionInProgress &&
      !previousVersionIsBuilt &&
      !isLoading &&
      isStreamingComplete &&
      loadingState === "processing"
    ) {
      return `Building version ${selectedVersion}...`;
    }
    if (
      isCorrectionInProgress &&
      !previousVersionIsBuilt &&
      !isLoading &&
      loadingState === "starting"
    ) {
      return `Starting version ${selectedVersion}...`;
    }
    return undefined;
  };

  return (
    <>
      {shouldShowLoader &&
        !isCorrectionInProgress &&
        !(
          isFirstGeneration &&
          (loadingState === "starting" ||
            (loadingState === null && isWebcontainerReady)) &&
          displayVersion === undefined &&
          !hasEverLoaded
        ) && (
          <div className="relative size-full z-50">
            {shouldUseMockupLoader ? (
              <ComponentLoadingMockup fileName={undefined} />
            ) : (
              <LoadingStateComponent
                state={loadingState || "processing"}
                customTitle={getLoaderCustomTitle()}
              />
            )}
          </div>
        )}

      {buildError && !isCorrectionInProgress && (
        <div className="relative flex size-full h-full items-center justify-center px-4">
          <Alert
            variant="default"
            className="bg-secondary text-foreground h-2/3 max-h-[80vh] w-full items-center justify-center"
          >
            <AlertCircle className="size-6" />
            <AlertDescription className="flex size-full flex-col pl-12!">
              <p className="text-lg font-semibold">{buildError.title}</p>
              <div className="flex size-full flex-col overflow-y-auto">
                <p className="mb-4 text-sm whitespace-pre-line">
                  {buildError.description}
                </p>
                {buildError.exitCode && (
                  <p className="text-muted-foreground mb-2 text-sm">
                    Exit code: {buildError.exitCode}
                  </p>
                )}
                {buildError.errors && buildError.errors.length > 0 ? (
                  <div className="bg-muted rounded-md p-4">
                    <p className="mb-2 font-mono text-xs font-semibold">
                      Build Output:
                    </p>
                    <pre className="max-h-[600px] overflow-auto font-mono text-xs wrap-break-word whitespace-pre-wrap text-red-600 dark:text-red-400">
                      {buildError.errors.join("\n\n---\n\n")}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-muted rounded-md p-4">
                    <p className="text-muted-foreground font-mono text-xs">
                      No error output captured. The build process failed but did
                      not produce error messages.
                    </p>
                  </div>
                )}
              </div>
              {authorized &&
                buildError.errors &&
                buildError.errors.length > 0 &&
                !isLoading &&
                loadingState === "error" && (
                  <Button
                    className="mt-2 self-end"
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
                    Ask CodeRocket to fix it
                  </Button>
                )}
            </AlertDescription>
          </Alert>
        </div>
      )}
      {chatId &&
        (displayVersion !== undefined ||
          (isFirstGeneration &&
            (loadingState === "starting" ||
              (loadingState === null && isWebcontainerReady)) &&
            !hasEverLoaded)) &&
        (!buildError || isCorrectionInProgress) &&
        (!shouldShowLoader ||
          (isFirstGeneration &&
            (loadingState === "starting" ||
              (loadingState === null && isWebcontainerReady)) &&
            displayVersion === undefined &&
            !hasEverLoaded)) && (
          <div
            className={cn(
              "relative size-full flex items-center justify-center",
              breakpoint === "tablet" && "bg-muted",
              breakpoint === "mobile" && "bg-muted",
            )}
          >
            <div
              className={cn(
                "relative size-full transition-all duration-300",
                breakpoint === "desktop" && "w-full h-full",
                breakpoint === "tablet" &&
                  "w-[768px] h-full max-w-full max-h-full shadow-2xl",
                breakpoint === "mobile" &&
                  "w-[375px] h-full max-w-full max-h-full shadow-2xl",
              )}
            >
              {shouldShowBadge ||
              (isCorrectionInProgress && loadingState !== "starting") ? (
                <div className="border-primary bg-background absolute top-4 right-4 z-20 flex items-center gap-2 rounded-full border px-4 py-2 shadow-xl">
                  <Loader2 className="text-primary size-4 animate-spin" />
                  <span className="text-primary text-sm font-medium">
                    {isCorrectionInProgress
                      ? isLoading
                        ? `Fixing version ${selectedVersion}...`
                        : loadingState === "processing"
                          ? `Building version ${selectedVersion}...`
                          : loadingState === "deploying"
                            ? `Deploying version ${selectedVersion}...`
                            : `Fixing version ${selectedVersion}...`
                      : isLoading && hasActiveGeneration
                        ? `Generating version ${selectedVersion}...`
                        : loadingState === "processing"
                          ? `Building version ${selectedVersion}...`
                          : `Generating version ${selectedVersion}...`}
                  </span>
                </div>
              ) : null}
              {/* Afficher le loader "Starting version #" par-dessus l'iframe qui charge */}
              {((isFirstGeneration &&
                (loadingState === "starting" ||
                  (loadingState === null && isWebcontainerReady)) &&
                displayVersion === undefined &&
                !hasEverLoaded &&
                !isLoading) ||
                (!isFirstGeneration &&
                  previousVersionIsBuilt &&
                  displayVersion !== undefined &&
                  loadingState === "starting" &&
                  !hasEverLoaded &&
                  !isLoading) ||
                (isCorrectionInProgress &&
                  loadingState === "starting" &&
                  !isLoading)) &&
                !buildError && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <LoadingStateComponent
                      state="starting"
                      customTitle={`Starting version ${selectedVersion}...`}
                    />
                  </div>
                )}
              {(displayVersion !== undefined ||
                (isFirstGeneration &&
                  (loadingState === "starting" ||
                    (loadingState === null && isWebcontainerReady)) &&
                  !hasEverLoaded)) && (
                <>
                  <iframe
                    ref={iframeRef}
                    key={`iframe-${displayVersion ?? selectedVersion}-${iframeKey}`}
                    src={`https://${chatId}-${displayVersion ?? selectedVersion}.webcontainer.coderocket.app`}
                    className="size-full border-none"
                    loading="eager"
                    onLoad={() => {
                      // Pour la première génération, définir displayVersion et hasEverLoaded en premier
                      // pour que shouldShowLoader devienne false immédiatement
                      if (isFirstGeneration && displayVersion === undefined) {
                        setDisplayVersion(selectedVersion);
                        setPreviousVersionHasError(false);
                      }
                      setHasEverLoaded(true);
                      // Always clear loading state when iframe is ready
                      setLoadingState(null);
                      const hashIndex = previewPathSuffix.indexOf("#");
                      const hash =
                        hashIndex !== -1
                          ? previewPathSuffix.substring(hashIndex)
                          : "";
                      if (hash && iframeRef.current?.contentWindow) {
                        setTimeout(() => {
                          try {
                            const targetElement =
                              iframeRef.current?.contentDocument?.querySelector(
                                hash,
                              );
                            if (targetElement) {
                              targetElement.scrollIntoView({
                                behavior: "smooth",
                              });
                            }
                          } catch (e) {
                            console.error("Error scrolling to anchor:", e);
                          }
                        }, 100);
                      }
                    }}
                  />
                  {isElementSelectionActive && (
                    <ElementSelector iframeRef={iframeRef} />
                  )}
                </>
              )}
            </div>
          </div>
        )}
    </>
  );
}
