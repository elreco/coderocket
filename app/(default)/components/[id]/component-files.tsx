"use client";

import { FileIcon, Trash2 } from "lucide-react";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, getInitials } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  ContentChunk,
  handleAIcompletionForHTML,
  hasArtifacts,
  splitContentIntoChunks,
} from "@/utils/completion-parser";
import { storageUrl } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

export default function ComponentFiles({
  message,
  isDeletable,
  authorized,
  selectedVersion,
  activeTab,
  handleVersionSelect,
  handleDeleteVersion,
  isCanvas,
  isLoading,
}: {
  message: Tables<"messages"> & {
    chats: {
      user: Tables<"users">;
      prompt_image: string | null;
    };
  };
  isDeletable: boolean;
  selectedVersion: number | null;
  authorized: boolean;
  activeTab: string;
  handleVersionSelect: (version: number, tabName?: string) => void;
  handleDeleteVersion: (id: number, version: number) => void;
  isCanvas: boolean;
  isLoading: boolean;
}) {
  const [serializedContents, setSerializedContents] = useState<
    (MDXRemoteSerializeResult | null)[]
  >([]);
  const [files, setFiles] = useState<
    {
      name: string | null;
      content: string;
    }[]
  >([]);
  const [hasArtifact, setHasArtifact] = useState(false);
  const [chunks, setChunks] = useState<ContentChunk[]>([]);

  useEffect(() => {
    const prepareContent = async () => {
      const hasArtifactResult = hasArtifacts(message.content);
      setHasArtifact(hasArtifactResult);
      setFiles(
        hasArtifactResult
          ? handleAIcompletionForHTML(message.content, message.theme)
          : [],
      );
      setChunks(splitContentIntoChunks(message.content));

      const contents = await Promise.all(
        splitContentIntoChunks(message.content).map(async (chunk) => {
          if (chunk.type === "text") {
            return await serialize(chunk.content);
          }
          return null;
        }),
      );

      setSerializedContents(contents);
    };

    prepareContent();
  }, [message.content]);

  const isSelectedVersion = selectedVersion === message.version && !isLoading;

  const handleFileClick = (
    version: number,
    file?: { name: string | null; content: string },
  ) => {
    if (isLoading) {
      return;
    }
    handleVersionSelect(version, file?.name || undefined);
  };

  return (
    <div
      className={cn(
        "flex px-2 py-6 flex-col sm:px-4 hover:bg-primary/10 transition-all",
        isSelectedVersion &&
          message.role === "assistant" &&
          "bg-primary hover:bg-primary cursor-auto",
      )}
    >
      <div className="flex w-full gap-2">
        {message.role === "assistant" ? (
          <div className="mr-2 flex flex-col items-center justify-start space-y-2">
            <Avatar className="rounded-none">
              <AvatarImage src="/logo-white.png" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
            {isDeletable && authorized && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    disabled={isLoading}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Version</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this version?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        handleDeleteVersion(message.id, message.version - 1)
                      }
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ) : (
          <Avatar className="mr-2 rounded-lg">
            <AvatarImage
              src={message.chats.user.avatar_url || ""}
              alt={message.chats.user.full_name || ""}
            />
            <AvatarFallback className="border bg-background">
              <span className="text-xs">
                {getInitials(message.chats.user.full_name || "")}
              </span>
            </AvatarFallback>
          </Avatar>
        )}

        {message.role === "user" ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">{message.content}</p>
            {message.chats.prompt_image && (
              <img
                src={`${storageUrl}/${message.chats.prompt_image}`}
                alt="screenshot"
                className="size-full max-w-full rounded-md border shadow-md"
              />
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-4">
            <h2
              className={cn(
                "text-lg font-semibold transition-all hover:text-foreground/75",
                isSelectedVersion && "text-foreground hover:text-foreground",
                isLoading ? "cursor-default" : "cursor-pointer",
              )}
              onClick={() => handleFileClick(message.version)}
            >
              Version #{message.version}
            </h2>
            {hasArtifact &&
              chunks.map((chunk, index) => (
                <div key={index}>
                  {chunk.type === "text" && serializedContents[index] && (
                    <div className="prose w-full max-w-full whitespace-normal text-sm text-foreground prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:font-mono prose-pre:text-sm prose-pre:text-foreground">
                      <MDXRemote {...serializedContents[index]} />
                    </div>
                  )}
                  {chunk.type === "artifact" && (
                    <div className="w-full space-y-2">
                      <div className="rounded-lg border bg-background p-4 text-foreground">
                        <h3 className="mb-4 text-sm font-semibold">
                          Files generated
                        </h3>
                        <div className="space-y-4">
                          {files.map((file, index) => (
                            <div
                              key={index}
                              className={cn(
                                "flex items-center rounded text-primary bg-foreground p-4 transition-all hover:bg-foreground/80",
                                isLoading ? "cursor-default" : "cursor-pointer",
                                activeTab === file.name &&
                                  isSelectedVersion &&
                                  !isCanvas &&
                                  "bg-green-500 hover:bg-green-500 text-foreground",
                              )}
                              onClick={() =>
                                handleFileClick(message.version, file)
                              }
                            >
                              <FileIcon className="mr-2 size-4" />
                              <div className="font-mono text-sm">
                                {file.name || "untitled.html"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            {message.screenshot && (
              <img
                src={message.screenshot}
                alt="screenshot"
                className={cn(
                  "size-full max-w-full cursor-pointer rounded-md border shadow-md",
                  isLoading ? "cursor-default" : "cursor-pointer",
                )}
                onClick={() => handleFileClick(message.version)}
              />
            )}
          </div>
        )}
      </div>
      <p
        className={cn(
          "mt-2 text-right text-xs font-semibold text-primary",
          isSelectedVersion && "text-foreground",
        )}
      >
        {getRelativeDate(message.created_at)}
      </p>
    </div>
  );
}
