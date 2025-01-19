"use client";

import { Loader2, AlertCircle } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { takeScreenshot } from "@/utils/capture-screenshot";
import { ChatFile } from "@/utils/completion-parser";
import { setupProject, stopServer } from "@/utils/webcontainer";

type LoadingState = "initializing" | "starting" | "error" | null;

function LoadingState({ state }: { state: LoadingState }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
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
  const [loadingState, setLoadingState] =
    useState<LoadingState>("initializing");
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleScreenshot = async (url: string) => {
    if (chatId && selectedVersion !== undefined) {
      await takeScreenshot(chatId, selectedVersion, undefined, url);
    }
  };

  useEffect(() => {
    if (isLoading || files.length === 0) return;

    const setupEnvironment = async () => {
      await stopServer();
      setLoadingState("initializing");
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
          /* if (chatId && selectedVersion !== undefined) {
            await handleScreenshot(url);
          } */
          setLoadingState(null);
        });
      } catch (error) {
        setError(error instanceof Error ? error.message : "Setup failed");
        setLoadingState("error");
        await stopServer();
      }
    };

    setupEnvironment();
    return () => {
      stopServer();
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

      <iframe
        ref={iframeRef}
        src={iframeSrc || undefined}
        className={`size-full border-none bg-white ${
          !iframeSrc || isLoading || error || loadingState ? "hidden" : ""
        }`}
      />

      {!isLoading && !error && !loadingState && !iframeSrc && (
        <LoadingState state={loadingState} />
      )}
    </>
  );
}
