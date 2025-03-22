"use client";

import { Loader2, AlertCircle, WandSparkles, RefreshCw } from "lucide-react";
import React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WebcontainerRender } from "@/components/webcontainer/webcontainer-render";
/* import { WebcontainerTerminal } from "@/components/webcontainer/webcontainer-terminal"; */
import {
  useComponentContext,
  WebcontainerLoadingState,
} from "@/context/component-context";
import { useWebcontainer } from "@/context/webcontainer-context";
import { FREE_CHAR_LIMIT } from "@/utils/config";

import { Markdown } from "./markdown";

function LoadingStateComponent({ state }: { state: WebcontainerLoadingState }) {
  const { setInput, handleSubmitToAI, authorized } = useComponentContext();

  const handleContinueGeneration = () => {
    const continuePrompt = "Continue where you left off";
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
          {state === "deploying" && "Deploying your application..."}
          {state === "processing" && "Processing your application..."}
          {state === "starting" && "Starting your application..."}
        </h3>
        <p className="text-sm text-muted-foreground">
          {state === "initializing" &&
            "Setting up your development environment."}
          {state === "deploying" && "It may take a few minutes."}
          {state === "processing" && "Analyzing and generating your component."}
          {state === "starting" && "One moment, your application is starting."}
        </p>
      </div>
    </div>
  );
}

export default function ComponentPreview() {
  const { loadingState, buildError } = useWebcontainer();
  const {
    chatId,
    selectedVersion,
    isLoading,
    authorized,
    setInput,
    isWebcontainerReady,
  } = useComponentContext();
  const { previewId } = useWebcontainer();

  return (
    <>
      {loadingState && !previewId && !isLoading && !buildError && (
        <LoadingStateComponent state={loadingState} />
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
                <Markdown>{buildError.content}</Markdown>
              </div>
              {authorized && buildError.content && (
                <Button
                  className="mt-2 self-end"
                  onClick={() => {
                    const errorContent = buildError.content;
                    const truncatedContent =
                      errorContent.length > FREE_CHAR_LIMIT
                        ? errorContent.substring(0, FREE_CHAR_LIMIT)
                        : errorContent;
                    setInput("Fix the following error: " + truncatedContent);
                  }}
                >
                  <WandSparkles className="size-4" />
                  Ask Tailwind AI to fix it
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}
      {!isWebcontainerReady &&
        previewId &&
        !buildError &&
        !isLoading &&
        !loadingState && <WebcontainerRender previewId={previewId} />}
      {chatId &&
        selectedVersion !== undefined &&
        !isLoading &&
        !buildError &&
        !loadingState &&
        isWebcontainerReady && (
          <iframe
            src={`https://${chatId}-${selectedVersion}.webcontainer.tailwindai.dev`}
            className="size-full border-none"
            sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
            allow="credentialless"
            loading="eager"
          />
        )}
    </>
  );
}
