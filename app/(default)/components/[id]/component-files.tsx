"use client";

import { Paintbrush, Trash2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserMessage } from "@/components/user-message";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  ContentChunk,
  extractDataTheme,
  handleAIcompletionForHTML,
  hasArtifacts,
  splitContentIntoChunks,
} from "@/utils/completion-parser";
import { storageUrl } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { getFileConfig } from "@/utils/file-extensions";
import { getInitials, formatFileSize } from "@/utils/helpers";
import { rehypePlugins } from "@/utils/markdown";
import { remarkPlugins } from "@/utils/markdown";

import { deleteVersionByMessageId } from "./actions";
import { useComponentContext } from "./component-context";

export default function ComponentFiles({
  message,
}: {
  message: Tables<"messages"> & {
    chats: {
      user: Tables<"users">;
      prompt_image: string | null;
    };
  };
}) {
  const { toast } = useToast();
  const {
    authorized,
    messages,
    isCanvas,
    isLoading,
    selectedVersion,
    activeTab,
    handleVersionSelect,
    refreshChatData,
  } = useComponentContext();

  const [files, setFiles] = useState<
    {
      name: string | null;
      content: string;
    }[]
  >([]);
  const [hasArtifact, setHasArtifact] = useState(false);
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prepareContent = async () => {
      const hasArtifactResult = hasArtifacts(message.content);
      setHasArtifact(hasArtifactResult);
      setFiles(
        hasArtifactResult ? handleAIcompletionForHTML(message.content) : [],
      );
      setChunks(splitContentIntoChunks(message.content));
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

  const handleDeleteVersion = async (messageId: number) => {
    try {
      setIsDeleting(true);
      await deleteVersionByMessageId(messageId);
      const refreshedChatMessages = await refreshChatData();
      if (refreshedChatMessages) {
        const refreshedLastAssistantMessage = refreshedChatMessages.reduce(
          (prev, current) => (prev.version > current.version ? prev : current),
          { version: 0 },
        );
        if (refreshedLastAssistantMessage) {
          handleVersionSelect(refreshedLastAssistantMessage.version);
        }
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not premium, you can't delete a version. Please upgrade to premium and try again.",
        duration: 5000,
      });
    } finally {
      setIsDeleting(false);
      setIsAlertOpen(false);
    }
  };
  useEffect(() => {
    if (isSelectedVersion && messageRef.current) {
      const userMessage = messages.find(
        (m) => m.version === message.version && m.role === "user",
      );
      if (userMessage) {
        const userMessageElement = document.querySelector(
          `[data-message-id="${userMessage.id}"]`,
        );
        if (userMessageElement) {
          userMessageElement.scrollIntoView({
            behavior: "instant",
            block: "start",
          });
        }
      }
    }
  }, [isSelectedVersion, messages.length, message.version]);

  return (
    <div
      ref={messageRef}
      data-message-id={message.id}
      className={cn(
        "group flex px-2 py-6 flex-col sm:px-4 hover:bg-primary/10 transition-all",
        message.role === "user" && "bg-background/50 hover:bg-background/50",
        isSelectedVersion &&
          message.role === "assistant" &&
          "bg-primary hover:bg-primary cursor-auto",
      )}
    >
      <div className="flex w-full gap-2">
        {message.role === "assistant" ? (
          <div className="mr-2 flex flex-col items-center justify-start space-y-2">
            <Avatar
              className="size-10 cursor-pointer rounded-none"
              onClick={() => handleFileClick(message.version)}
            >
              <AvatarImage src="/logo-white.png" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
            {messages.length > 2 && authorized && (
              <AlertDialog
                open={isAlertOpen || isDeleting}
                onOpenChange={setIsAlertOpen}
              >
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
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        onClick={() => handleDeleteVersion(message.id)}
                        disabled={isDeleting}
                        loading={isDeleting}
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ) : (
          <Avatar className="mr-2 size-10">
            <AvatarImage
              src={message.chats.user.avatar_url || ""}
              alt={message.chats.user.full_name || ""}
            />
            <AvatarFallback className="bg-background">
              <span className="text-xs">
                {getInitials(message.chats.user.full_name || "")}
              </span>
            </AvatarFallback>
          </Avatar>
        )}

        {message.role === "user" ? (
          <div className="flex w-full flex-col gap-2">
            {message.chats.user?.full_name && (
              <h2 className="text-lg font-semibold">
                {message.chats.user.full_name}
              </h2>
            )}
            <UserMessage>{message.content}</UserMessage>
            {message.chats.prompt_image && (
              <img
                src={`${storageUrl}/${message.chats.prompt_image}`}
                alt="screenshot"
                className="size-full max-w-full rounded-md border border-foreground/10 shadow-md"
              />
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <h2
              className={cn(
                "text-lg font-semibold transition-all group-hover:text-primary",
                isSelectedVersion &&
                  "text-foreground group-hover:text-foreground",
                isLoading ? "cursor-default" : "cursor-pointer",
              )}
              onClick={() => handleFileClick(message.version)}
            >
              Version #{message.version}
            </h2>
            {hasArtifact &&
              chunks.map((chunk, index) => (
                <div key={index}>
                  {chunk.type === "text" && (
                    <ReactMarkdown
                      className="markdown text-sm"
                      remarkPlugins={remarkPlugins(true)}
                      rehypePlugins={rehypePlugins(true)}
                    >
                      {chunk.content}
                    </ReactMarkdown>
                  )}
                  {chunk.type === "artifact" && (
                    <div className="w-full space-y-2">
                      <div
                        className={cn(
                          "rounded-lg border bg-background p-2 text-foreground",
                          !isSelectedVersion &&
                            "group-hover:border-primary/50 group-hover:shadow-primary/35 group-hover:shadow-2xl",
                        )}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-xs font-semibold">
                            {files.length === 1
                              ? "Output File"
                              : "Output Files"}
                          </h3>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant="secondary"
                                className="cursor-default border border-border"
                              >
                                <Paintbrush className="mr-1 size-3" />{" "}
                                <span className="first-letter:uppercase">
                                  {extractDataTheme(files[0].content)}
                                </span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Theme</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="space-y-2">
                          {files.map((file, index) => {
                            const fileConfig = getFileConfig(
                              file.name || "untitled.html",
                            );
                            const FileIcon = fileConfig.icon;

                            return (
                              <div
                                key={index}
                                className={cn(
                                  "flex items-center justify-between rounded p-1",
                                  `${fileConfig.color} bg-foreground`,
                                  "hover:bg-gradient-to-l from-emerald-400 via-emerald-500 to-emerald-600 hover:text-foreground",
                                  isLoading
                                    ? "cursor-default"
                                    : "cursor-pointer",
                                  activeTab === file.name &&
                                    isSelectedVersion &&
                                    !isCanvas &&
                                    "bg-gradient-to-l from-emerald-400 via-emerald-500 to-emerald-600 text-foreground",
                                )}
                                onClick={() =>
                                  handleFileClick(message.version, file)
                                }
                              >
                                <div className="flex items-center">
                                  <FileIcon className="mr-2 size-4" />
                                  <div className="font-mono text-sm">
                                    {file.name || "untitled.html"}
                                  </div>
                                </div>
                                <div className="text-xs opacity-75">
                                  {formatFileSize(
                                    new Blob([file.content]).size,
                                  )}
                                </div>
                              </div>
                            );
                          })}
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
                  "size-full max-w-full cursor-pointer rounded-md border transition-all duration-300",
                  isLoading ? "cursor-default" : "cursor-pointer",
                  !isSelectedVersion &&
                    "group-hover:border-primary/50 group-hover:shadow-primary/35 group-hover:shadow-2xl",
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
          isSelectedVersion &&
            message.role === "assistant" &&
            "text-foreground",
        )}
      >
        {getRelativeDate(message.created_at)}
      </p>
    </div>
  );
}
