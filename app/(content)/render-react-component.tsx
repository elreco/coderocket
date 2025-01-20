"use client";

import { Loader2, AlertCircle } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { WebContainerRender } from "@/components/webcontainer-render";
import { takeScreenshot } from "@/utils/capture-screenshot";
import { ChatFile } from "@/utils/completion-parser";
import { setupProject, stopWebContainer } from "@/utils/webcontainer";

type LoadingState = "initializing" | "starting" | "error" | null;

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

const getPreviewId = (url: string) => {
  const match = url.match(
    /^https?:\/\/([^.]+)\.local-credentialless\.webcontainer-api\.io/,
  );

  if (match) {
    const previewId = match[1];
    return previewId;
  } else {
    console.warn("[Preview] Invalid WebContainer URL:", url);
  }
};

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

  const handleScreenshot = async (previewId: string) => {
    if (chatId && selectedVersion !== undefined) {
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
      try {
        const webcontainerInstance = await setupProject(files);
        setLoadingState("starting");

        webcontainerInstance?.on("error", (error) => {
          setError(`WebContainer error: ${error.message}`);
          setLoadingState("error");
        });

        webcontainerInstance?.on("server-ready", async (port, url) => {
          onServerReady(url);
          setIframeSrc(url);
          const previewId = getPreviewId(url);
          setPreviewId(previewId);
          if (previewId) {
            await handleScreenshot(previewId);
          }
          setLoadingState(null);
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

      {loadingState && <LoadingState state={loadingState} />}
      {previewId && !isLoading && !error && !loadingState && (
        <WebContainerRender previewId={previewId} />
      )}

      {!isLoading && !error && !loadingState && !iframeSrc && (
        <LoadingState state={loadingState} />
      )}
    </>
  );
}
