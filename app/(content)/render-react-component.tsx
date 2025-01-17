"use client";

import { WebContainerProcess, PreviewMessageType } from "@webcontainer/api";
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import React, { useEffect, useState, useRef, useCallback } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChatFile } from "@/utils/completion-parser";

import { getWebContainer, setupProject } from "./webcontainer";

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
}: {
  files: ChatFile[];
  isLoading: boolean;
  onServerReady: (url: string) => void;
}) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [loadingState, setLoadingState] =
    useState<LoadingState>("initializing");
  const [error, setError] = useState<string | null>(null);
  const serverProcess = useRef<WebContainerProcess | null>(null);

  /* const converter = new Convert({
    fg: "#fff",
    bg: "#000",
    newline: true,
    escapeXML: true,
  }); */

  const stopServer = useCallback(async () => {
    if (serverProcess.current) {
      serverProcess.current.kill();
      serverProcess.current = null;
    }
  }, []);

  useEffect(() => {
    if (isLoading || files.length === 0) return;

    const setupEnvironment = async () => {
      await stopServer();
      setLoadingState("initializing");
      setError(null);

      try {
        const webcontainer = await setupProject(files);
        webcontainer.on("error", (error) => {
          console.error("WebContainer error:", error);
          setError(`WebContainer error: ${error.message}`);
          setLoadingState("error");
        });

        webcontainer.on("preview-message", (message) => {
          switch (message.type) {
            case PreviewMessageType.UncaughtException:
              setError(
                `Uncaught Exception: ${message.message}\n${message.stack || ""}`,
              );
              setLoadingState("error");
              break;

            case PreviewMessageType.UnhandledRejection:
              setError(
                `Unhandled Rejection: ${message.message}\n${message.stack || ""}`,
              );
              setLoadingState("error");
              break;

            case PreviewMessageType.ConsoleError: {
              const errorMessage = message.args
                .map((arg) =>
                  typeof arg === "string" ? arg : JSON.stringify(arg),
                )
                .join(" ");
              if (
                errorMessage.includes("SyntaxError:") ||
                errorMessage.includes("Error:")
              ) {
                setError(`Console Error: ${errorMessage}\n${message.stack}`);
                setLoadingState("error");
              }
              break;
            }
          }
        });

        setLoadingState("starting");
        serverProcess.current = await webcontainer.spawn("npm", ["run", "dev"]);

        webcontainer.on("server-ready", async (port, url) => {
          onServerReady(url);
          setIframeSrc(url);
          setLoadingState(null);
        });
      } catch (error) {
        console.error("Setup failed:", error);
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

  const handleRetry = useCallback(async () => {
    try {
      const webcontainer = await getWebContainer();
      setLoadingState("starting");
      setError(null);

      serverProcess.current = await webcontainer.spawn("npm", ["run", "dev"]);

      const errorStream = new WritableStream({
        write(data) {
          if (data.includes("Error:")) {
            setError(data);
            setLoadingState("error");
          }
        },
      });

      serverProcess.current.output.pipeTo(errorStream).catch(console.error);

      await Promise.race([
        new Promise<void>((resolve) => {
          webcontainer.on("server-ready", (port, url) => {
            onServerReady(url);
            setLoadingState(null);
            setIframeSrc(url);
            resolve();
          });
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Server start timeout")), 30000),
        ),
      ]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Server start failed");
      setLoadingState("error");
      await stopServer();
    }
  }, [stopServer]);

  return (
    <>
      {isLoading && <LoadingState state="initializing" />}
      {error && (
        <div className="mx-4 flex items-center justify-center">
          <Alert variant="destructive" className="bg-secondary px-12">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-center"
              onClick={handleRetry}
            >
              <RefreshCcw className="mr-2 size-4 text-center" />
              Reload server
            </Button>
          </Alert>
        </div>
      )}
      {loadingState && <LoadingState state={loadingState} />}
      <iframe
        src={iframeSrc || undefined}
        className={`size-full border-none ${
          !iframeSrc || isLoading || error || loadingState ? "hidden" : ""
        }`}
        sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
      />
      {!isLoading && !error && !loadingState && !iframeSrc && (
        <LoadingState state={loadingState} />
      )}
    </>
  );
}
