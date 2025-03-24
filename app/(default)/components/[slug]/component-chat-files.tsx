"use client";

import { Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { UserWidget } from "@/components/user-widget";
import { useComponentContext } from "@/context/component-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  ContentChunk,
  extractDirectFiles,
  splitCompletedContentIntoChunks,
  ChatFile,
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

  useEffect(() => {
    if (!message.content) {
      setFiles([]);
      setChunks([]);
      return;
    }

    // Extraire les fichiers une seule fois
    const extractedFiles = extractDirectFiles(message.content);

    // Découper le contenu en chunks
    let contentChunks = splitCompletedContentIntoChunks(message.content);

    // Dédupliquer les chunks de texte identiques
    contentChunks = contentChunks.filter((chunk, index, array) => {
      if (chunk.type === "text") {
        return (
          array.findIndex(
            (c) => c.type === "text" && c.content === chunk.content,
          ) === index
        );
      }
      return true;
    });

    // Si on a des fichiers et qu'ils ne sont pas dans un artifact existant
    const hasArtifactWithFiles = contentChunks.some(
      (chunk) =>
        chunk.type === "artifact" && chunk.content.includes("<tailwindaiFile"),
    );

    // Créer un artifact avec les fichiers (complets ou incomplets)
    if (extractedFiles.length > 0) {
      const artifactTitle = isLoading
        ? "Generating Files..."
        : "Generated Files";
      const artificialArtifact = `<tailwindaiArtifact title="${artifactTitle}">
${extractedFiles
  .map((file) => {
    const isIncompleteAttr =
      isLoading && file.isIncomplete ? ' isIncomplete="true"' : "";
    return `<tailwindaiFile name="${file.name}"${isIncompleteAttr}>${file.content}</tailwindaiFile>`;
  })
  .join("\n")}
</tailwindaiArtifact>`;

      if (!hasArtifactWithFiles) {
        // Filtrer les chunks pour enlever ceux qui contiennent des fichiers
        const textChunks = contentChunks.filter(
          (chunk) => !chunk.content.includes("<tailwindaiFile"),
        );

        // Ajouter l'artifact au début avec le bon type
        setChunks([
          {
            type: "artifact" as const,
            content: artificialArtifact,
          },
          ...textChunks,
        ]);
      } else {
        // Remplacer l'artifact existant par le nouveau
        const updatedChunks = contentChunks.map((chunk) => {
          if (
            chunk.type === "artifact" &&
            chunk.content.includes("<tailwindaiFile")
          ) {
            return {
              type: "artifact" as const,
              content: artificialArtifact,
            };
          }
          return chunk;
        });
        setChunks(updatedChunks);
      }
    } else {
      setChunks(contentChunks);
    }

    setFiles(extractedFiles);
  }, [message.content, isLoading]);

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
              chunks={chunks}
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
