"use client";

import { Loader2, AlertCircle } from "lucide-react";
import React, { useEffect } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useComponentContext } from "@/context/component-context";
import {
  WebcontainerLoadingState,
  useWebcontainer,
} from "@/context/webcontainer-context";
import { ChatFile } from "@/utils/completion-parser";

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
          {state === "deploying" && "Almost ready to show your application."}
        </p>
      </div>
    </div>
  );
}

function ProgressMessagesComponent({ messages }: { messages: string[] }) {
  return (
    <Card className="mx-auto mt-8 w-full max-w-xl shadow-md">
      <CardHeader>
        <CardTitle className="text-center text-primary">
          Deployment Progress
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent>
        <ScrollArea className="h-48 w-full p-10">
          <ul className="space-y-2">
            {messages.map((message, index) => (
              <li key={index} className="text-sm text-muted-foreground">
                {message}
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function RenderReactComponent({ files }: { files: ChatFile[] }) {
  const { loadingState, buildError, error, setFiles, progressMessages } =
    useWebcontainer();
  const { chatId, selectedVersion, isLoading } = useComponentContext();

  useEffect(() => {
    if (!isLoading && files.length > 0) {
      setFiles(files);
    }
  }, [files, isLoading]);

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
          <Alert variant="destructive" className="bg-secondary px-12">
            <AlertCircle className="size-4" />
            <AlertDescription className="flex flex-col gap-2">
              <strong>{buildError.title}</strong>
              <span>{buildError.description}</span>
              <span className="text-xs opacity-75">{buildError.content}</span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {loadingState && !error && (
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
          <iframe
            src={`/webcontainer/${chatId}-${selectedVersion}/index.html`}
            className="size-full border-none"
          />
        )}
    </>
  );
}
