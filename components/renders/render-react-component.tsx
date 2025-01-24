"use client";

import { Loader2, AlertCircle } from "lucide-react";
import React, { useEffect } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { WebContainerRender } from "@/components/webcontainers/webcontainer-render";
import { useComponentContext } from "@/context/component-context";
import { useWebContainer } from "@/context/webcontainer-context";
import { WebContainerLoadingState } from "@/context/webcontainer-context";
import { ChatFile } from "@/utils/completion-parser";

function LoadingStateComponent({ state }: { state: WebContainerLoadingState }) {
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

export default function RenderReactComponent({ files }: { files: ChatFile[] }) {
  const { loadingState, previewError, error, setFiles } = useWebContainer();
  const { previewId, isLoading } = useComponentContext();

  useEffect(() => {
    if (!isLoading && files.length > 0) {
      setFiles(files);
    }
  }, [files, isLoading]);

  return (
    <>
      {isLoading && !error && <LoadingStateComponent state="initializing" />}

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
      {loadingState && !error && <LoadingStateComponent state={loadingState} />}
      {previewId && !isLoading && !error && !previewError && !loadingState && (
        <WebContainerRender previewId={previewId} />
      )}
    </>
  );
}
