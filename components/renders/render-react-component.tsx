"use client";

import { Loader2, AlertCircle, WandSparkles } from "lucide-react";
import React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useComponentContext } from "@/context/component-context";
import {
  WebcontainerLoadingState,
  useWebcontainer,
} from "@/context/webcontainer-context";

import { Button } from "../ui/button";

function LoadingStateComponent({ state }: { state: WebcontainerLoadingState }) {
  return (
    <div className="flex size-full flex-col items-center justify-center space-y-4 p-8 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <div className="space-y-2">
        <h3 className="font-semibold">
          {state === "initializing" && "Initializing WebContainer..."}
          {state === "deploying" && "Deploying your application..."}
        </h3>
        <p className="text-sm text-muted-foreground">
          {state === "initializing" &&
            "Setting up your development environment."}
          {state === "deploying" && "It may take a few minutes."}
        </p>
      </div>
    </div>
  );
}

function ProgressMessagesComponent({ messages }: { messages: string[] }) {
  return (
    <div className="mx-auto mt-4 w-full max-w-xl text-center">
      <ul className="space-y-1">
        {messages.map((message, index) => (
          <li key={index} className="text-sm text-muted-foreground">
            {message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RenderReactComponent() {
  const { loadingState, buildError, error, progressMessages } =
    useWebcontainer();
  const { chatId, selectedVersion, isLoading, authorized, setInput } =
    useComponentContext();
  const [iframeLoading, setIframeLoading] = React.useState(true);

  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  React.useEffect(() => {
    setIframeLoading(true);
  }, [chatId, selectedVersion]);

  return (
    <>
      {isLoading && !buildError && !error && (
        <LoadingStateComponent state="initializing" />
      )}

      {error && (
        <div className="flex size-full items-center justify-center px-4">
          <Alert
            variant="destructive"
            className="bg-destructive px-12 text-foreground"
          >
            <AlertDescription className="m-0 flex items-center gap-2">
              <AlertCircle className="size-4 !text-foreground" />
              <p>{error}</p>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {buildError && !isLoading && (
        <div className="mx-4 flex items-center justify-center">
          <Alert
            variant="destructive"
            className="bg-destructive px-12 text-foreground"
          >
            <AlertCircle className="size-4 fill-foreground text-foreground" />
            <AlertDescription className="flex flex-col gap-2">
              <strong>{buildError.title}</strong>
              <span>{buildError.description}</span>
              <span className="text-xs opacity-75">{buildError.content}</span>
            </AlertDescription>
            {authorized && (
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() =>
                  setInput("Fix the following error: " + buildError.content)
                }
              >
                <WandSparkles className="size-4" />
                Ask Tailwind AI to fix it
              </Button>
            )}
          </Alert>
        </div>
      )}

      {loadingState && !error && !buildError && (
        <div className="flex flex-col items-center">
          <LoadingStateComponent state={loadingState} />
          {progressMessages.length > 0 && (
            <ProgressMessagesComponent messages={progressMessages} />
          )}
        </div>
      )}

      {chatId &&
        selectedVersion !== undefined &&
        !isLoading &&
        !error &&
        !buildError &&
        !loadingState && (
          <>
            {iframeLoading && <LoadingStateComponent state="initializing" />}
            <iframe
              src={`https://${chatId}-${selectedVersion}.dev.tailwindai.dev`}
              className={`size-full border-none ${iframeLoading ? "hidden" : ""}`}
              onLoad={handleIframeLoad}
            />
          </>
        )}
    </>
  );
}
