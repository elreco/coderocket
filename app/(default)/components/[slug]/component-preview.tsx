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

function LoadingStateComponent({ state }: { state: WebcontainerLoadingState }) {
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

  return (
    <div className="flex size-full flex-col items-center justify-center space-y-4 p-8 text-center">
      <Loader2 className="text-primary size-8 animate-spin" />
      <div className="space-y-2">
        <h3 className="font-semibold">
          {state === "initializing" && "Initializing WebContainer..."}
          {state === "deploying" && "Deploying application..."}
          {state === "processing" && "Processing application..."}
          {state === "starting" && "Starting application..."}
        </h3>
        <p className="text-muted-foreground text-sm">
          {state === "initializing" && "Setting up development environment."}
          {state === "deploying" && "It may take a few minutes."}
          {state === "processing" && "Analyzing and generating component."}
          {state === "starting" && "One moment, application is starting."}
        </p>
      </div>
    </div>
  );
}

export default function ComponentPreview() {
  const { loadingState, buildError } = useBuilder();
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
  } = useComponentContext();
  const [iframeLoading, setIframeLoading] = React.useState(true);
  const [hasEverLoaded, setHasEverLoaded] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const getInitialDisplayVersion = () => {
    if (selectedVersion === undefined) return undefined;
    // Pour la première version, ne pas définir displayVersion initialement
    // Il sera défini plus tard quand la version sera prête
    if (selectedVersion === 0) {
      return undefined;
    }
    const isGenerating =
      isLoading || (loadingState && loadingState !== "error");
    if (selectedVersion > 0 && isGenerating) {
      return selectedVersion - 1;
    }
    return selectedVersion;
  };

  const [displayVersion, setDisplayVersion] = React.useState<
    number | undefined
  >(getInitialDisplayVersion);
  const [previousVersionHasError, setPreviousVersionHasError] =
    React.useState(false);

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
    }
  }, [isScrapingWebsite, selectedVersion]);

  React.useEffect(() => {
    if (selectedVersion === undefined) return;

    const isGenerating =
      isLoading || (loadingState && loadingState !== "error");

    // Pour la première version pendant le scraping, forcer displayVersion à undefined
    // pour que le loader s'affiche
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

    // Pour les versions > 0 (y compris pendant le scraping), définir displayVersion à la version précédente
    if (displayVersion === undefined) {
      if (selectedVersion > 0 && (isGenerating || isScrapingWebsite)) {
        const prevVersion = selectedVersion - 1;
        setDisplayVersion(prevVersion);
        const supabase = createClient();
        supabase
          .from("messages")
          .select("build_error, content")
          .eq("chat_id", chatId)
          .eq("role", "assistant")
          .eq("version", prevVersion)
          .single()
          .then(({ data }) => {
            const hasError =
              data?.build_error ||
              data?.content?.includes("<!-- FINISH_REASON: length -->") ||
              data?.content?.includes("<!-- FINISH_REASON: error -->");
            setPreviousVersionHasError(!!hasError);
          });
      } else if (!isGenerating && !isScrapingWebsite) {
        setDisplayVersion(selectedVersion);
        setPreviousVersionHasError(false);
      }
    } else if (
      !isGenerating &&
      !isScrapingWebsite &&
      displayVersion !== selectedVersion &&
      isWebcontainerReady
    ) {
      setDisplayVersion(selectedVersion);
      setPreviousVersionHasError(false);
    }
  }, [
    isLoading,
    selectedVersion,
    displayVersion,
    loadingState,
    isWebcontainerReady,
    chatId,
    isScrapingWebsite,
  ]);

  React.useEffect(() => {
    if (isWebcontainerReady) {
      setIframeLoading(true);
      const timeout = setTimeout(() => {
        setIframeLoading(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [chatId, displayVersion, isWebcontainerReady]);

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
  const isFirstGeneration =
    selectedVersion === 0 ||
    selectedVersion === -1 ||
    selectedVersion === undefined;
  const isGenerating = isLoading || (loadingState && loadingState !== "error");

  // Pour la première version pendant le scraping, afficher le loader
  // Pour les versions > 0, on affiche l'iframe de la version précédente (pas le loader)
  const isScrapingFirstVersion =
    isScrapingWebsite &&
    (selectedVersion === 0 ||
      selectedVersion === -1 ||
      selectedVersion === undefined);

  const shouldShowLoader =
    isScrapingFirstVersion ||
    (!isScrapingWebsite && isContinuingFromLengthError) ||
    (!isScrapingWebsite && isFirstGeneration && isLoading) ||
    (!isScrapingWebsite &&
      isFirstGeneration &&
      loadingState &&
      loadingState !== "error") ||
    (!isScrapingWebsite && isLengthError && isGenerating) ||
    (!isScrapingWebsite &&
      !isFirstGeneration &&
      isGenerating &&
      previousVersionHasError);

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
    }
  }, [isScrapingWebsite, selectedVersion, displayVersion]);
  const isGeneratingNewVersion =
    !isFirstGeneration &&
    !isLengthError &&
    (isLoading ||
      loadingState === "processing" ||
      loadingState === "deploying");
  const isCorrectionInProgress =
    buildError &&
    (isLoading ||
      (loadingState && loadingState !== "error" && loadingState !== null));
  const previewPathSuffix = previewPath === "/" ? "" : previewPath;

  return (
    <>
      {shouldShowLoader && !isCorrectionInProgress && (
        <div className="relative size-full z-50">
          <LoadingStateComponent state={loadingState || "processing"} />
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
        displayVersion !== undefined &&
        (!buildError || isCorrectionInProgress) &&
        !shouldShowLoader && (
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
              {(isGeneratingNewVersion || isCorrectionInProgress) &&
                hasEverLoaded && (
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
                        : loadingState === "processing"
                          ? `Building version ${selectedVersion}...`
                          : loadingState === "deploying"
                            ? `Deploying version ${selectedVersion}...`
                            : `Generating version ${selectedVersion}...`}
                    </span>
                  </div>
                )}
              {iframeLoading && isWebcontainerReady && (
                <div className="bg-background absolute inset-0 z-30 flex items-center justify-center">
                  <LoadingStateComponent state="starting" />
                </div>
              )}
              {displayVersion !== undefined && (
                <>
                  <iframe
                    ref={iframeRef}
                    key={`iframe-${displayVersion}-${iframeKey}`}
                    src={`https://${chatId}-${displayVersion}.webcontainer.coderocket.app${previewPathSuffix}`}
                    className="size-full border-none"
                    loading="eager"
                    onLoad={() => {
                      setIframeLoading(false);
                      setHasEverLoaded(true);
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
