import { Loader, Paintbrush, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { MigrationRunner } from "@/components/migration-runner";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComponentContext } from "@/context/component-context";
import { cn } from "@/lib/utils";
import {
  ChatFile,
  extractDataTheme,
  categorizeFiles,
} from "@/utils/completion-parser";
import { Framework } from "@/utils/config";
import { getFileConfig } from "@/utils/file-extensions";
import { formatFileSize } from "@/utils/helpers";

import { Markdown } from "./markdown";
import { ThinkingBlock } from "./thinking-block";

export function ChunkReader({
  chunks,
  files,
  versionFiles,
  handleFileClick,
  isSelectedVersion,
  version,
  chatId,
  messageId,
  migrationsExecuted,
}: {
  chunks: { type: string; content: string }[];
  files: ChatFile[];
  versionFiles?: ChatFile[];
  handleFileClick: (version: number, file: ChatFile) => void;
  isSelectedVersion?: boolean;
  version?: number;
  chatId: string;
  messageId: number;
  migrationsExecuted?: Array<{ name: string; executed_at: string }> | null;
}) {
  const { isCanvas, activeTab, selectedFramework, isLoading } =
    useComponentContext();

  const effectiveFiles = useMemo(() => {
    if (!versionFiles || versionFiles.length === 0) {
      return files;
    }
    const fullByName = new Map<string, ChatFile>();
    files.forEach((file) => {
      if (file.name) {
        fullByName.set(file.name, file);
      }
    });
    return versionFiles.map((file) => {
      if (!file.name) {
        return file;
      }
      const full = fullByName.get(file.name);
      if (!full) {
        return file;
      }
      return {
        ...file,
        content: full.content,
      };
    });
  }, [files, versionFiles]);

  const migrationFiles = useMemo(() => {
    const categorized = categorizeFiles(effectiveFiles);
    return categorized.migrations;
  }, [effectiveFiles]);

  return chunks.map((chunk, index) => {
    // Pour les chunks de type "artifact", utiliser directement les fichiers fournis
    let artifactFiles: ChatFile[] = [];
    if (chunk.type === "artifact") {
      artifactFiles = effectiveFiles;
    }

    // Nettoyer les fragments incomplets de balises thinking avant affichage
    let textContent = chunk.content;
    if (chunk.type === "text") {
      // Supprimer les fragments incomplets à la fin (comme "<thinkin", "<think", etc.)
      textContent = textContent
        .replace(/<thinkin[\s\S]*$/gi, "")
        .replace(/<thinki[\s\S]*$/gi, "")
        .replace(/<think[\s\S]*$/gi, "")
        .replace(/<thin[\s\S]*$/gi, "")
        .replace(/<thi[\s\S]*$/gi, "")
        .trim();
    }

    return (
      <div key={index} className="text-sm">
        {chunk.type === "text" && textContent && (
          <Markdown>{textContent}</Markdown>
        )}
        {chunk.type === "thinking" && <ThinkingBlock content={chunk.content} />}
        {chunk.type === "artifact" && (
          <div className="w-full space-y-2">
            <div
              className={cn(
                "border-primary/30 bg-primary/10 text-foreground my-2 rounded-lg border p-2",
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-primary text-xs font-semibold">
                  {isLoading
                    ? "Generating Files..."
                    : artifactFiles.length === 1
                      ? "Generated File"
                      : "Generated Files"}
                </h3>
                {selectedFramework === Framework.HTML &&
                  artifactFiles.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="secondary"
                          className="border-border cursor-default border"
                        >
                          <Paintbrush className="mr-1 size-3" />{" "}
                          <span className="first-letter:uppercase">
                            {extractDataTheme(artifactFiles[0].content)}
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
                  {artifactFiles.map((file, fileIndex) => {
                    const fileConfig = getFileConfig(
                      file.name || "untitled.html",
                      selectedFramework,
                    );
                    const FileIcon = fileConfig.icon;

                    return (
                      <div
                        key={fileIndex}
                        className={cn(
                          "group bg-foreground flex w-full items-center justify-between rounded p-1",
                          !file.isDelete &&
                            "from-primary via-primary/90 to-primary/80 hover:text-foreground hover:bg-linear-to-l",
                          isLoading || file.isDelete
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer",
                          file.isIncomplete && "text-amber-600 opacity-100",
                          activeTab === file.name &&
                            isSelectedVersion &&
                            !isCanvas &&
                            "from-primary via-primary/90 to-primary/80 text-foreground bg-linear-to-l",
                        )}
                        onClick={() =>
                          version !== undefined && !isLoading && !file.isDelete
                            ? handleFileClick(version, file)
                            : null
                        }
                      >
                        <div className="flex max-w-full items-center">
                          <FileIcon
                            className={cn("mr-2 size-4", fileConfig.color)}
                          />
                          <div
                            className={cn(
                              "mr-2 flex items-center text-sm font-medium whitespace-pre-wrap",
                              !file.isDelete &&
                                "text-background group-hover:text-foreground",
                              file.isDelete && "text-red-500!",
                              file.isIncomplete &&
                                "text-primary group-hover:text-foreground",
                              activeTab === file.name &&
                                isSelectedVersion &&
                                !isCanvas &&
                                !file.isDelete &&
                                "text-foreground",
                              file.isDelete && "group-hover:text-red-500!",
                            )}
                          >
                            {file.isDelete ? (
                              <Trash2 className="mr-1 size-4" />
                            ) : file.isIncomplete ? (
                              <Loader className="mr-1 size-4 animate-spin" />
                            ) : null}
                            <span>
                              {file.name
                                ? file.name.split("/").pop()
                                : "untitled.html"}
                            </span>
                          </div>
                        </div>
                        {!file.isDelete && (
                          <div
                            className={cn(
                              "text-background text-xs font-semibold whitespace-nowrap opacity-75",
                              "group-hover:text-foreground",
                              activeTab === file.name &&
                                isSelectedVersion &&
                                !isCanvas &&
                                "text-foreground opacity-100",
                            )}
                          >
                            {formatFileSize(new Blob([file.content]).size)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        {chunk.type === "artifact" && migrationFiles.length > 0 && (
          <div className="mt-3 space-y-3">
            {migrationFiles.map((migration, migIdx) => (
              <MigrationRunner
                key={migIdx}
                migrationFile={{
                  name: migration.name || `migration_${migIdx + 1}.sql`,
                  content: migration.content,
                }}
                chatId={chatId}
                messageId={messageId}
                migrationsExecuted={migrationsExecuted}
                isGenerating={isLoading}
              />
            ))}
          </div>
        )}
      </div>
    );
  });
}
