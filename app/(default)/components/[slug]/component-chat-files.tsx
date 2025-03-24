"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";

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
import { UserWidget } from "@/components/user-widget";
import { useComponentContext } from "@/context/component-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  ChatFile,
  ContentChunk,
  extractDirectFiles,
  extractFilesFromCompletedCompletion,
  hasCompletedArtifacts,
  splitCompletedContentIntoChunks,
} from "@/utils/completion-parser";
import { storageUrl } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

import { deleteVersionByMessageId } from "./actions";
import { ChunkReader } from "./chunk-reader";
import { Markdown } from "./markdown";
import { PromptImage } from "./prompt-image";

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
    isLoading,
    selectedVersion,
    handleVersionSelect,
    refreshChatData,
    setForceBuild,
  } = useComponentContext();

  const [files, setFiles] = useState<ChatFile[]>([]);
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const messageRef = useRef<HTMLDivElement>(null);

  const completionWithFiles = useMemo(() => {
    if (!message.content) return null;
    if (hasCompletedArtifacts(message.content)) {
      return message.content;
    }
    return message.content;
  }, [message.content]);

  useEffect(() => {
    if (!completionWithFiles) return;

    // Extraire les fichiers directement du contenu
    const extractedFiles = extractDirectFiles(completionWithFiles);

    // Créer un seul tableau de chunks
    let contentChunks = splitCompletedContentIntoChunks(completionWithFiles);

    // Si des fichiers ont été extraits, créer un seul artifact
    if (extractedFiles.length > 0) {
      const artificialArtifact = `<tailwindaiArtifact title="Generated Files">
${extractedFiles.map((file) => `<tailwindaiFile name="${file.name}">${file.content}</tailwindaiFile>`).join("\n")}
</tailwindaiArtifact>`;

      contentChunks = [
        {
          type: "artifact",
          content: artificialArtifact,
        },
      ];
    }

    // Mettre à jour les états une seule fois
    setChunks(contentChunks);
    setFiles(extractedFiles);
  }, [completionWithFiles]);

  // Ajouter un état pour gérer le chargement initial
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (isInitialLoad && completionWithFiles) {
      setIsInitialLoad(false);
    }
  }, [completionWithFiles, isInitialLoad]);

  // Ne pas afficher les chunks pendant le chargement initial
  const displayChunks = isInitialLoad ? [] : chunks;

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
        duration: 4000,
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
      className={cn("flex px-2 py-6 flex-col sm:px-4 transition-all")}
    >
      <div className="flex w-full gap-2">
        {message.role === "user" ? (
          <div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-background p-5">
            <UserWidget
              id={message.chats.user.id}
              createdAt={message.created_at}
              userAvatarUrl={message.chats.user.avatar_url}
              userFullName={message.chats.user.full_name}
            />
            <Markdown>{message.content}</Markdown>
            <PromptImage
              image={
                message.prompt_image
                  ? `${storageUrl}/${message.prompt_image}`
                  : null
              }
            />
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2 overflow-x-auto text-sm">
            <div className="flex items-center justify-between">
              <div className="mr-2 flex items-center">
                <Avatar className="size-10 rounded-none">
                  <AvatarImage src="/logo-white.png" />
                  <AvatarFallback>T</AvatarFallback>
                </Avatar>
                <div className="ml-2 flex flex-col items-start">
                  <h2 className={cn("text-lg font-semibold")}>
                    Version #{message.version}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {getRelativeDate(message.created_at)}
                  </p>
                </div>
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
            <ChunkReader
              chunks={displayChunks}
              files={files}
              handleFileClick={handleFileClick}
              isSelectedVersion={isSelectedVersion}
              version={message.version}
            />
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
    </div>
  );
}
