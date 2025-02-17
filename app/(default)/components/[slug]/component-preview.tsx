"use client";

import { Loader2, AlertCircle, WandSparkles } from "lucide-react";
import React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { WebcontainerRender } from "@/components/webcontainer/webcontainer-render";
/* import { WebcontainerTerminal } from "@/components/webcontainer/webcontainer-terminal"; */
import { useComponentContext } from "@/context/component-context";
import {
  WebcontainerLoadingState,
  useWebcontainer,
} from "@/context/webcontainer-context";

import { Button } from "../../../../components/ui/button";

function LoadingStateComponent({ state }: { state: WebcontainerLoadingState }) {
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
  const { loadingState, buildError, error } = useWebcontainer();
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
      {loadingState && !previewId && !isLoading && !buildError && !error && (
        <LoadingStateComponent state={loadingState} />
      )}

      {error && (
        <div className="flex size-full items-center justify-center px-4">
          <Alert
            variant="destructive"
            className="bg-destructive px-12 text-foreground"
          >
            <AlertDescription className="m-0 flex items-center gap-2">
              <AlertCircle className="size-4" />
              <p>{error}</p>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {buildError && !isLoading && (
        <div className="flex size-full items-center justify-center px-4">
          <Alert variant="default" className=" text-foreground">
            <AlertCircle className="size-6" />
            <AlertDescription className="flex flex-col !pl-12">
              <p className="text-lg font-semibold">{buildError.title}</p>
              <p className="mb-4 whitespace-pre-line text-sm">
                {buildError.description}
              </p>
              <p className="whitespace-pre-line text-xs opacity-75">
                {buildError.content}
              </p>
              {authorized && (
                <Button
                  variant="outline"
                  className="mt-2 self-end"
                  onClick={() =>
                    setInput("Fix the following error: " + buildError.content)
                  }
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
        !error &&
        !buildError &&
        !isLoading &&
        !loadingState && <WebcontainerRender previewId={previewId} />}
      {/* {!isWebcontainerReady && terminal && !error && !isLoading && (
        <WebcontainerTerminal />
      )} */}
      {chatId &&
        selectedVersion !== undefined &&
        !isLoading &&
        !error &&
        !buildError &&
        !loadingState &&
        isWebcontainerReady && (
          <iframe
            src={`https://${chatId}-${selectedVersion}.webcontainer.tailwindai.dev`}
            className="size-full border-none"
            sandbox="" // ❌ Supprime toutes les restrictions
            allow="*"
            referrerPolicy="no-referrer"
          />
        )}
    </>
  );
}
