"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";

import { SelectedElementDisplay } from "@/components/selected-element-display";
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
import { UserWidget } from "@/components/user-widget";
import {
  useComponentContext,
  SelectedElementData,
} from "@/context/component-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  ContentChunk,
  extractDirectFiles,
  splitCompletedContentIntoChunks,
  splitContentIntoChunks,
  ChatFile,
} from "@/utils/completion-parser";
import { storageUrl } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { tokensToRockets } from "@/utils/rocket-conversion";

import { deleteVersionByMessageId } from "./actions";
import { ChunkReader } from "./chunk-reader";
import { Markdown } from "./markdown";
import { PromptFiles } from "./prompt-file";

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
    setWebcontainerReady,
    setSelectedVersion,
  } = useComponentContext();

  const [files, setFiles] = useState<ChatFile[]>([]);
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message.content) {
      if (!isLoading) {
        setFiles([]);
        setChunks([]);
      }
      return;
    }

    // Extraire les fichiers une seule fois
    const extractedFiles = extractDirectFiles(message.content);

    // NOUVEAU: Extraire spécifiquement le texte avant le premier artifact ou balise coderocketFile
    let introText = "";
    const firstArtifactIndex = message.content.indexOf("<coderocketArtifact");
    const firstFileIndex = message.content.indexOf("<coderocketFile");

    // Si on a du texte avant les balises, l'extraire
    if (firstArtifactIndex > 0 || firstFileIndex > 0) {
      // Prendre l'index du premier élément qui apparaît, ou la longueur totale si aucun n'est trouvé
      const cutIndex = Math.min(
        firstArtifactIndex > -1 ? firstArtifactIndex : Number.MAX_SAFE_INTEGER,
        firstFileIndex > -1 ? firstFileIndex : Number.MAX_SAFE_INTEGER,
      );

      if (cutIndex < Number.MAX_SAFE_INTEGER) {
        introText = message.content.substring(0, cutIndex).trim();

        if (introText.includes("<!-- FINISH_REASON:")) {
          introText = introText.split("<!-- FINISH_REASON:")[0].trim();
        }

        introText = introText
          .replace(/<thinking>[\s\S]*?<\/thinking>/g, "")
          .trim();
      }
    }

    // Découper le contenu en chunks
    let contentChunks;
    if (isLoading) {
      contentChunks = splitContentIntoChunks(message.content);
    } else {
      contentChunks = splitCompletedContentIntoChunks(message.content);
    }

    // NOUVEAU: Fonction pour vérifier si un texte contient des balises incomplètes
    const containsIncompleteTag = (text: string): boolean => {
      // Vérifier s'il y a une balise ouvrante sans balise fermante correspondante
      const openingTags = ["<coderocketArtifact", "<coderocketFile"];

      const closingTags = ["</coderocketArtifact>", "</coderocketFile>"];

      // Vérifier chaque paire de balises
      for (let i = 0; i < openingTags.length; i++) {
        const openTag = openingTags[i];
        const closeTag = closingTags[i];

        // Si une balise ouvrante existe sans sa balise fermante correspondante
        if (text.includes(openTag) && !text.includes(closeTag)) {
          return true;
        }

        // Vérifier si une balise fermante est incomplète (ex: "</tailwin")
        if (
          text.includes("<") &&
          text.includes("/") &&
          closeTag.startsWith(text.substring(text.lastIndexOf("<")))
        ) {
          return true;
        }
      }

      // Vérifier les fragments de balises (comme "<tailwind" sans le reste)
      for (const tag of [...openingTags, ...closingTags]) {
        // Pour chaque caractère de 3 à la longueur-1, vérifier si ce fragment apparaît à la fin du texte
        for (let i = 3; i < tag.length; i++) {
          const fragment = tag.substring(0, i);
          if (text.endsWith(fragment)) {
            return true;
          }
        }
      }

      return false;
    };

    // NOUVEAU: Fonction pour vérifier si un texte contient des balises vides ou inutiles
    const containsEmptyOrUselessTags = (text: string): boolean => {
      // Vérifier les balises artifact sans contenu utile
      const emptyArtifactPattern =
        /<coderocketArtifact[^>]*>[\s\n]*<\/coderocketArtifact>/g;
      if (emptyArtifactPattern.test(text)) {
        return true;
      }

      // Vérifier les balises artifact avec juste un titre mais sans contenu
      const justTitlePattern =
        /<coderocketArtifact[^>]*title="[^"]*"[^>]*>[\s\n]*<\/coderocketArtifact>/g;
      if (justTitlePattern.test(text)) {
        return true;
      }

      // Vérifier les balises file sans contenu utile
      const emptyFilePattern =
        /<coderocketFile[^>]*>[\s\n]*<\/coderocketFile>/g;
      if (emptyFilePattern.test(text)) {
        return true;
      }

      // Vérifier les balises avec très peu de contenu réel (moins de 5 caractères non-blancs)
      const checkLowContent = (tagPattern: RegExp): boolean => {
        let match;
        while ((match = tagPattern.exec(text)) !== null) {
          const tagContent = match[1];
          const nonWhitespaceContent = tagContent.replace(/\s/g, "");
          if (nonWhitespaceContent.length < 5) {
            return true;
          }
        }
        return false;
      };

      // Appliquer la vérification aux contenus des balises artifact et file
      const artifactContentPattern =
        /<coderocketArtifact[^>]*>([\s\S]*?)<\/coderocketArtifact>/g;
      const fileContentPattern =
        /<coderocketFile[^>]*>([\s\S]*?)<\/coderocketFile>/g;

      if (
        checkLowContent(artifactContentPattern) ||
        checkLowContent(fileContentPattern)
      ) {
        return true;
      }

      return false;
    };

    contentChunks = contentChunks
      .filter((chunk) => {
        if (chunk.type !== "text") {
          if (
            chunk.type === "artifact" &&
            containsEmptyOrUselessTags(chunk.content)
          ) {
            return false;
          }
          return true;
        }

        if (chunk.content.includes("<!-- FINISH_REASON:")) {
          return false;
        }

        if (isLoading && containsIncompleteTag(chunk.content)) {
          return false;
        }

        if (containsEmptyOrUselessTags(chunk.content)) {
          return false;
        }

        return true;
      })
      .map((chunk) => {
        if (chunk.type === "text") {
          const cleanedContent = chunk.content
            .replace(/<thinking>[\s\S]*?<\/thinking>/g, "")
            .trim();
          return {
            ...chunk,
            content: cleanedContent,
          };
        }
        return chunk;
      })
      .filter((chunk) => {
        if (chunk.type === "text" && !chunk.content) {
          return false;
        }
        return true;
      });

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

    // Si on a extrait du texte d'introduction, l'ajouter comme premier chunk de texte
    if (introText && !containsIncompleteTag(introText)) {
      // Vérifier si ce texte n'existe pas déjà dans les chunks
      const textExists = contentChunks.some(
        (chunk) => chunk.type === "text" && chunk.content.includes(introText),
      );

      if (!textExists) {
        contentChunks.unshift({
          type: "text",
          content: introText,
        });
      }
    }

    // Si on a des fichiers et qu'ils ne sont pas dans un artifact existant
    const hasArtifactWithFiles = contentChunks.some(
      (chunk) =>
        chunk.type === "artifact" && chunk.content.includes("<coderocketFile"),
    );

    // Créer un artifact avec les fichiers (complets ou incomplets)
    if (extractedFiles.length > 0) {
      const artifactTitle = isLoading
        ? "Generating Files..."
        : "Generated Files";
      const artificialArtifact = `<coderocketArtifact title="${artifactTitle}">
${extractedFiles
  .map((file) => {
    const isIncompleteAttr =
      isLoading && file.isIncomplete ? ' isIncomplete="true"' : "";
    return `<coderocketFile name="${file.name}"${isIncompleteAttr}>${file.content}</coderocketFile>`;
  })
  .join("\n")}
</coderocketArtifact>`;

      if (!hasArtifactWithFiles) {
        // Filtrer les chunks pour enlever ceux qui contiennent des fichiers
        const textChunks = contentChunks.filter(
          (chunk) =>
            chunk.type === "text" ||
            (chunk.type === "artifact" &&
              !chunk.content.includes("<coderocketFile")),
        );

        // Ajouter l'artifact au début avec le bon type - mais après les chunks de texte
        const textOnlyChunks = textChunks.filter(
          (chunk) => chunk.type === "text",
        );
        const otherChunks = textChunks.filter((chunk) => chunk.type !== "text");

        setChunks([
          ...textOnlyChunks,
          {
            type: "artifact" as const,
            content: artificialArtifact,
          },
          ...otherChunks,
        ]);
      } else {
        // Remplacer l'artifact existant par le nouveau
        const updatedChunks = contentChunks.map((chunk) => {
          if (
            chunk.type === "artifact" &&
            chunk.content.includes("<coderocketFile")
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
      // S'assurer qu'il y a au moins un chunk de texte si pas de fichiers et texte disponible
      if (contentChunks.length === 0 && message.content.trim()) {
        contentChunks = [
          {
            type: "text" as const,
            content: message.content.trim(),
          },
        ];
      }
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

      setWebcontainerReady(false);
      setForceBuild(true);

      await deleteVersionByMessageId(messageId);

      setSelectedVersion(undefined);

      const refreshedChatMessages =
        refreshChatData !== undefined ? await refreshChatData() : [];

      if (refreshedChatMessages) {
        const refreshedLastAssistantMessage = refreshedChatMessages.reduce(
          (prev, current) => (prev.version > current.version ? prev : current),
          { version: 0 },
        );

        if (refreshedLastAssistantMessage) {
          handleVersionSelect(refreshedLastAssistantMessage.version);
          setWebcontainerReady(false);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("Only the last version")) {
        toast({
          variant: "destructive",
          title: "Cannot delete version",
          description:
            "Only the last version can be deleted. Please delete newer versions first.",
          duration: 4000,
        });
      } else if (errorMessage.includes("payment-required")) {
        toast({
          variant: "destructive",
          title: "Premium account required",
          description:
            "You need a premium account to delete versions. Please upgrade and try again.",
          duration: 4000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error deleting version",
          description: errorMessage || "An unexpected error occurred.",
          duration: 4000,
        });
      }
      setForceBuild(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectedVersion, messages.length, message.version]);

  return (
    <div
      ref={messageRef}
      data-message-id={message.id}
      className={cn("flex flex-col p-3 transition-all")}
    >
      <div className="flex w-full gap-2">
        {message.role === "user" ? (
          <div className="border-primary/20 bg-primary/5 flex w-full flex-col gap-1 rounded-lg border p-2 transition-all">
            <UserWidget
              id={message.chats.user.id}
              createdAt={message.created_at}
              userAvatarUrl={message.chats.user.avatar_url}
              userFullName={message.chats.user.full_name}
            />
            {(() => {
              if (message.selected_element) {
                const elementData =
                  message.selected_element as SelectedElementData;
                return (
                  <>
                    <SelectedElementDisplay element={elementData} />
                    {message.content && <Markdown>{message.content}</Markdown>}
                  </>
                );
              }
              return <Markdown>{message.content}</Markdown>;
            })()}
            <PromptFiles
              fileItems={(() => {
                if (message.files && Array.isArray(message.files)) {
                  const fileItems = message.files.filter(
                    (
                      item,
                    ): item is {
                      url: string;
                      order: number;
                      type?: string;
                      mimeType?: string;
                      source?: string;
                    } =>
                      typeof item === "object" &&
                      item !== null &&
                      "url" in item &&
                      typeof item.url === "string" &&
                      "order" in item &&
                      typeof item.order === "number",
                  );
                  return fileItems.sort((a, b) => a.order - b.order);
                }
                return message.prompt_image
                  ? [{ url: message.prompt_image, order: 0 }]
                  : [];
              })()}
              storageUrl={storageUrl}
            />
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2 overflow-x-auto text-sm wrap-break-word">
            <div className="mt-1 flex flex-col items-start">
              <div className="mr-2 flex items-center">
                {message.is_github_pull ? (
                  <Avatar className="size-10 rounded-none bg-gray-900">
                    <SiGithub className="size-6 text-white" />
                  </Avatar>
                ) : (
                  <Avatar className="size-10 rounded-none">
                    <AvatarImage src="/logo-white.png" />
                    <AvatarFallback>T</AvatarFallback>
                  </Avatar>
                )}
                <div className="ml-2 flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <h2 className={cn("text-lg font-semibold")}>
                      Version #{message.version}
                    </h2>
                    {message.is_github_pull && (
                      <Badge variant="outline" className="h-5 text-xs">
                        GitHub Pull
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {getRelativeDate(message.created_at)}
                  </p>
                </div>
              </div>
              {messages.length > 2 &&
                authorized &&
                (() => {
                  const assistantMessages = messages.filter(
                    (m) => m.role === "assistant",
                  );
                  const highestVersion = Math.max(
                    ...assistantMessages.map((m) => m.version),
                  );
                  const isLastVersion = message.version === highestVersion;
                  const canDelete =
                    assistantMessages.length === 1 || isLastVersion;

                  if (!canDelete) {
                    return null;
                  }

                  return (
                    <AlertDialog
                      open={isAlertOpen || isDeleting}
                      onOpenChange={setIsAlertOpen}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="mt-2 p-2 text-xs"
                          size="sm"
                          disabled={isLoading}
                        >
                          <Trash2 className="size-3" />
                          Delete version
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
                              {isDeleting ? (
                                <>
                                  <Loader2 className="mr-2 size-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="size-4" />
                                  Delete version
                                </>
                              )}
                            </Button>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  );
                })()}
            </div>
            <ChunkReader
              chunks={chunks}
              files={files}
              handleFileClick={handleFileClick}
              isSelectedVersion={isSelectedVersion}
              version={message.version}
              chatId={message.chat_id}
              messageId={message.id}
              migrationsExecuted={
                Array.isArray(message.migrations_executed)
                  ? (message.migrations_executed as Array<{
                      name: string;
                      executed_at: string;
                    }>)
                  : null
              }
            />
            {message.input_tokens !== null &&
              message.output_tokens !== null && (
                <div className="text-muted-foreground mt-1 text-xs">
                  Cost:{" "}
                  {tokensToRockets(
                    (message.input_tokens || 0) + (message.output_tokens || 0),
                  ).toFixed(2)}{" "}
                  🚀 Rockets
                </div>
              )}
            {message.screenshot && (
              <img
                src={message.screenshot || undefined}
                alt="screenshot"
                className={cn(
                  "h-auto w-full max-w-full cursor-pointer rounded-md border transition-all duration-300",
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
