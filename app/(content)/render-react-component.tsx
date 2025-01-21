"use client";

import { Loader2, AlertCircle } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { WebContainerRender } from "@/components/webcontainer-render";
import { takeScreenshot } from "@/utils/capture-screenshot";
import { ChatFile } from "@/utils/completion-parser";
import {
  getPreviewId,
  setupProject,
  stopWebContainer,
} from "@/utils/webcontainer";

type LoadingState = "initializing" | "starting" | "error" | null;

// Ajout du type pour les erreurs de preview
type PreviewError = {
  title: string;
  description: string;
  content: string;
};

function LoadingState({ state }: { state: LoadingState }) {
  return (
    <div className="flex size-full flex-col items-center justify-center space-y-4 p-8 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <div className="space-y-2">
        <h3 className="font-semibold">
          {state === "initializing" && "Initializing WebContainer..."}
          {state === "starting" && "Starting development server..."}
        </h3>
        <p className="text-sm text-muted-foreground">
          {state === "initializing" &&
            "Setting up your development environment"}
          {state === "starting" && "Almost ready to show your application"}
        </p>
      </div>
    </div>
  );
}

export default function RenderReactComponent({
  files,
  isLoading,
  onServerReady,
  chatId,
  selectedVersion,
}: {
  files: ChatFile[];
  isLoading: boolean;
  onServerReady: (url: string) => void;
  chatId?: string;
  selectedVersion?: number;
}) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | undefined>(undefined);
  const [loadingState, setLoadingState] =
    useState<LoadingState>("initializing");
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<PreviewError | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleScreenshot = async (previewId: string) => {
    if (chatId && selectedVersion !== undefined) {
      setLoadingState(null);
      try {
        await takeScreenshot(chatId, selectedVersion, undefined, previewId);
      } catch (error) {
        console.error("Error taking screenshot", error);
      }
    }
  };

  useEffect(() => {
    if (isLoading || files.length === 0) return;

    const setupEnvironment = async () => {
      setLoadingState("initializing");
      setPreviewId(undefined);
      setError(null);
      setPreviewError(null);
      try {
        const webcontainerInstance = await setupProject(files);
        setLoadingState("starting");

        webcontainerInstance?.on("error", (error) => {
          setError(`WebContainer error: ${error.message}`);
          setLoadingState("error");
        });

        webcontainerInstance?.on("preview-message", (message) => {
          if (
            message.type === "PREVIEW_UNCAUGHT_EXCEPTION" ||
            message.type === "PREVIEW_UNHANDLED_REJECTION"
          ) {
            const isPromise = message.type === "PREVIEW_UNHANDLED_REJECTION";
            setPreviewError({
              title: isPromise
                ? "Unhandled Promise Rejection"
                : "Uncaught Exception",
              description: message.message,
              content: `Error occurred at ${message.pathname}${message.search}${message.hash}`,
            });
          }
        });

        webcontainerInstance?.on("server-ready", async (port, url) => {
          onServerReady(url);
          setIframeSrc(url);
          const previewId = getPreviewId(url);
          setLoadingState(null);
          if (previewId) {
            setPreviewId(previewId);
            // await new Promise((resolve) => setTimeout(resolve, 20000));
            // await handleScreenshot(previewId);
          }
        });
      } catch (error) {
        setError(error instanceof Error ? error.message : "Setup failed");
        setLoadingState("error");
        stopWebContainer();
      }
    };

    setupEnvironment();
    return () => {
      stopWebContainer();
    };
  }, [files, isLoading]);

  return (
    <>
      {isLoading && <LoadingState state="initializing" />}

      {error && (
        <div className="mx-4 flex items-center justify-center">
          <Alert variant="destructive" className="bg-secondary px-12">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {previewError && !isLoading && (
        <div className="mx-4 flex items-center justify-center">
          <Alert variant="destructive" className="bg-secondary px-12">
            <AlertCircle className="size-4" />
            <AlertDescription className="flex flex-col gap-2">
              <strong>{previewError.title}</strong>
              <span>{previewError.description}</span>
              <span className="text-xs opacity-75">{previewError.content}</span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {loadingState && <LoadingState state={loadingState} />}
      {previewId && !isLoading && !error && !previewError && (
        <WebContainerRender
          previewId={previewId}
          className={loadingState ? "hidden" : "flex"}
        />
      )}

      {!isLoading && !error && !loadingState && !iframeSrc && (
        <LoadingState state={loadingState} />
      )}
    </>
  );
}
