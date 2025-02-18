"use client";

import { Paintbrush, Trash2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";

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
import { useComponentContext } from "@/context/component-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  ChatFile,
  ContentChunk,
  extractDataTheme,
  extractFilesFromCompletion,
  hasArtifacts,
  splitContentIntoChunks,
} from "@/utils/completion-parser";
import { Framework, storageUrl } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { getFileConfig } from "@/utils/file-extensions";
import { getInitials, formatFileSize } from "@/utils/helpers";

import { Markdown } from "../markdown";

import { deleteVersionByMessageId } from "./actions";

export default function ComponentChatFiles({
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
    selectedFramework,
    setForceBuild,
  } = useComponentContext();

  const [files, setFiles] = useState<ChatFile[]>([]);
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prepareContent = async () => {
      const hasArtifactResult = hasArtifacts(message.content);
      setFiles(
        hasArtifactResult ? extractFilesFromCompletion(message.content) : [],
      );
      setChunks(splitContentIntoChunks(message.content));
    };

    prepareContent();
  }, [message.content]);

  const isSelectedVersion = selectedVersion === message.version && !isLoading;

  const handleFileClick = (version: number, file?: ChatFile) => {
    if (isLoading || file?.isDelete) {
      return;
    }
    handleVersionSelect(version, file?.name || undefined);
  };

  const handleDeleteVersion = async (messageId: number) => {
    try {
      setIsDeleting(true);
      await deleteVersionByMessageId(messageId);
      setForceBuild(true);
      const refreshedChatMessages =
        refreshChatData !== undefined ? await refreshChatData() : [];

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
      className={cn("group flex px-2 py-6 flex-col sm:px-4 transition-all")}
    >
      <div className="flex w-full gap-2">
        {message.role === "user" ? (
          <div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-background p-5">
            <div className="flex items-center justify-start">
              <Avatar className="mr-2 size-10">
                <AvatarImage
                  src={message.chats.user.avatar_url || undefined}
                  alt={message.chats.user.full_name || undefined}
                />
                <AvatarFallback>
                  <span className="text-xs">
                    {getInitials(message.chats.user.full_name || "")}
                  </span>
                </AvatarFallback>
              </Avatar>
              {message.chats.user?.full_name && (
                <h2 className="text-lg font-semibold">
                  {message.chats.user.full_name}
                </h2>
              )}
            </div>
            <UserMessage>{message.content}</UserMessage>
            {message.chats.prompt_image && (
              <img
                src={`${storageUrl}/${message.chats.prompt_image}`}
                alt="screenshot"
                className="aspect-video w-full rounded-md border border-foreground/10 object-cover shadow-md"
              />
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2 overflow-x-auto text-sm">
            <div className="flex items-center justify-between">
              <div className="mr-2 flex items-center">
                <Avatar className="size-10 cursor-pointer rounded-none">
                  <AvatarImage src="/logo-white.png" />
                  <AvatarFallback>T</AvatarFallback>
                </Avatar>

                <h2 className={cn("text-lg ml-2 font-semibold")}>
                  Version #{message.version}
                </h2>
              </div>
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
            {chunks.map((chunk, index) => (
              <div key={index} className="text-sm">
                {chunk.type === "text" && <Markdown>{chunk.content}</Markdown>}
                {chunk.type === "artifact" && (
                  <div className="w-full space-y-2">
                    <div
                      className={cn(
                        "rounded-lg border bg-background p-2 text-foreground",
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-semibold">
                          {files.length === 1 ? "Output File" : "Output Files"}
                        </h3>
                        {selectedFramework === Framework.HTML && (
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
                        )}
                      </div>
                      <div className="space-y-2 overflow-x-auto">
                        <div className="flex w-fit min-w-full flex-col space-y-2">
                          {files.map((file, index) => {
                            const fileConfig = getFileConfig(
                              file.name || "untitled.html",
                            );
                            const FileIcon = fileConfig.icon;

                            return (
                              <div
                                key={index}
                                className={cn(
                                  "flex items-center justify-between rounded p-1 bg-foreground w-full",
                                  "hover:bg-gradient-to-l from-emerald-400 via-emerald-500 to-emerald-600 hover:text-foreground",
                                  isLoading || file.isDelete
                                    ? "cursor-not-allowed opacity-50"
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
                                <div className="flex max-w-full items-center">
                                  <FileIcon
                                    className={cn(
                                      "mr-2 size-4",
                                      fileConfig.color,
                                    )}
                                  />
                                  <div
                                    className={cn(
                                      "font-mono whitespace-pre-wrap text-sm font-medium text-border",
                                      file.isDelete &&
                                        "text-red-500 group-hover:text-red-500",
                                      activeTab === file.name &&
                                        isSelectedVersion &&
                                        !isCanvas &&
                                        "text-foreground",
                                    )}
                                  >
                                    {file.name || "untitled.html"}
                                  </div>
                                </div>
                                <div className="whitespace-nowrap text-xs text-border opacity-75">
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
                  </div>
                )}
              </div>
            ))}
            {message.screenshot && (
              <img
                src={message.screenshot || undefined}
                alt="screenshot"
                className={cn(
                  "size-full max-w-full cursor-pointer rounded-md border transition-all duration-300",
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
          "mt-2 text-right text-muted-foreground text-xs font-semibold",
        )}
      >
        {getRelativeDate(message.created_at)}
      </p>
    </div>
  );
}
