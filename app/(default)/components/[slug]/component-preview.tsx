"use client";

import { Loader2, AlertCircle, WandSparkles, RefreshCw } from "lucide-react";
import React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBuilder } from "@/context/builder-context";
import {
  useComponentContext,
  WebcontainerLoadingState,
} from "@/context/component-context";
import { createContinuePrompt } from "@/utils/completion-parser";
import { FREE_CHAR_LIMIT } from "@/utils/config";

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
        <div className="flex size-16 items-center justify-center rounded-full bg-blue-100 text-primary dark:bg-violet-900/20 dark:text-primary">
          <RefreshCw className="size-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-xl font-semibold">Generation in progress</h3>
          <p className="text-sm text-muted-foreground">
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
      <Loader2 className="size-8 animate-spin text-primary" />
      <div className="space-y-2">
        <h3 className="font-semibold">
          {state === "initializing" && "Initializing WebContainer..."}
          {state === "deploying" && "Deploying application..."}
          {state === "processing" && "Processing application..."}
          {state === "starting" && "Starting application..."}
        </h3>
        <p className="text-sm text-muted-foreground">
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
  } = useComponentContext();
  const [iframeLoading, setIframeLoading] = React.useState(false);

  const getInitialDisplayVersion = () => {
    if (selectedVersion === undefined) return undefined;
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

  React.useEffect(() => {
    if (selectedVersion === undefined) return;

    const isGenerating =
      isLoading || (loadingState && loadingState !== "error");

    if (displayVersion === undefined) {
      if (selectedVersion > 0 && isGenerating) {
        setDisplayVersion(selectedVersion - 1);
      } else if (!isGenerating) {
        setDisplayVersion(selectedVersion);
      }
    } else if (
      !isGenerating &&
      displayVersion !== selectedVersion &&
      isWebcontainerReady
    ) {
      setDisplayVersion(selectedVersion);
    }
  }, [
    isLoading,
    selectedVersion,
    displayVersion,
    loadingState,
    isWebcontainerReady,
  ]);

  React.useEffect(() => {
    if (isWebcontainerReady) {
      setIframeLoading(true);
      const timeout = setTimeout(() => {
        setIframeLoading(false);
      }, 3000);
      return () => clearTimeout(timeout);
    } else {
      setIframeLoading(false);
    }
  }, [chatId, selectedVersion, isWebcontainerReady]);

  const isFirstGeneration = selectedVersion === 0;
  const shouldShowLoader =
    (isFirstGeneration && isLoading) ||
    (isFirstGeneration && loadingState && loadingState !== "error");
  const isGeneratingNewVersion =
    !isFirstGeneration &&
    (isLoading || loadingState) &&
    loadingState !== "error";

  return (
    <>
      {shouldShowLoader && !buildError && (
        <LoadingStateComponent state={loadingState || "processing"} />
      )}

      {buildError && !isLoading && (
        <div className="flex size-full h-full items-center justify-center px-4 xl:w-2/3">
          <Alert
            variant="default"
            className="h-2/3 max-h-[80vh] w-full items-center justify-center bg-secondary text-foreground"
          >
            <AlertCircle className="size-6" />
            <AlertDescription className="flex size-full flex-col !pl-12">
              <p className="text-lg font-semibold">{buildError.title}</p>
              <div className="flex size-full flex-col overflow-y-auto">
                <p className="mb-4 whitespace-pre-line text-sm">
                  {buildError.description}
                </p>
                {buildError.exitCode && (
                  <p className="mb-2 text-sm text-muted-foreground">
                    Exit code: {buildError.exitCode}
                  </p>
                )}
                {buildError.errors && buildError.errors.length > 0 ? (
                  <div className="rounded-md bg-muted p-4">
                    <p className="mb-2 font-mono text-xs font-semibold">
                      Build Output:
                    </p>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-red-600 dark:text-red-400">
                      {buildError.errors.join("\n\n---\n\n")}
                    </pre>
                  </div>
                ) : (
                  <div className="rounded-md bg-muted p-4">
                    <p className="font-mono text-xs text-muted-foreground">
                      No error output captured. The build process failed but did
                      not produce error messages.
                    </p>
                  </div>
                )}
              </div>
              {authorized &&
                buildError.errors &&
                buildError.errors.length > 0 && (
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
        !buildError &&
        !shouldShowLoader && (
          <div className="relative size-full">
            {isGeneratingNewVersion && (
              <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-primary bg-background px-4 py-2 shadow-xl">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-primary">
                  {loadingState === "processing"
                    ? `Building version ${selectedVersion}...`
                    : loadingState === "deploying"
                      ? `Deploying version ${selectedVersion}...`
                      : `Generating version ${selectedVersion}...`}
                </span>
              </div>
            )}
            {iframeLoading &&
              isWebcontainerReady &&
              !isGeneratingNewVersion && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
                  <LoadingStateComponent state="starting" />
                </div>
              )}
            {displayVersion !== undefined && (
              <iframe
                key={`iframe-${displayVersion}`}
                src={`https://${chatId}-${displayVersion}.webcontainer.coderocket.app`}
                className="size-full border-none"
                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
                allow="credentialless"
                loading="eager"
                onLoad={() => setIframeLoading(false)}
              />
            )}
          </div>
        )}
    </>
  );
}
