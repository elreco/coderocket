import { Paintbrush } from "lucide-react";

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
  extractTitle,
  extractFilesFromArtifact,
} from "@/utils/completion-parser";
import { Framework } from "@/utils/config";
import { getFileConfig } from "@/utils/file-extensions";
import { formatFileSize } from "@/utils/helpers";

import { Markdown } from "./markdown";

export function ChunkReader({
  chunks,
  files,
  handleFileClick,
  isSelectedVersion,
  version,
}: {
  chunks: { type: string; content: string }[];
  files: ChatFile[];
  handleFileClick: (version: number, file: ChatFile) => void;
  isSelectedVersion?: boolean;
  version?: number;
}) {
  const { isCanvas, activeTab, selectedFramework, isLoading } =
    useComponentContext();

  // Les fichiers sont déjà filtrés dans prepareContent
  const validFiles = files;

  return chunks.map((chunk, index) => {
    // Pour les chunks de type "artifact", extraire les fichiers de cet artifact spécifique
    let artifactFiles: ChatFile[] = [];
    if (chunk.type === "artifact") {
      artifactFiles = extractFilesFromArtifact(chunk.content);

      // Si aucun fichier n'a été extrait de cet artifact, utiliser les fichiers globaux
      // Cela peut arriver si l'artifact est incomplet ou mal formé
      if (artifactFiles.length === 0) {
        artifactFiles = validFiles;
      }
    }

    return (
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
                  {extractTitle(chunk.content) ||
                    (artifactFiles.length === 1
                      ? "Output File"
                      : "Output Files")}
                </h3>
                {selectedFramework === Framework.HTML &&
                  artifactFiles.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="secondary"
                          className="cursor-default border border-border"
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
                    );
                    const FileIcon = fileConfig.icon;

                    return (
                      <div
                        key={fileIndex}
                        className={cn(
                          "group flex items-center justify-between rounded p-1 bg-foreground w-full",
                          "hover:bg-gradient-to-l from-emerald-400 via-emerald-500 to-emerald-600 hover:text-foreground",
                          isLoading || file.isDelete
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer",
                          file.isIncomplete && "opacity-100 text-amber-600",
                          activeTab === file.name &&
                            isSelectedVersion &&
                            !isCanvas &&
                            "bg-gradient-to-l from-emerald-400 via-emerald-500 to-emerald-600 text-foreground",
                        )}
                        onClick={() =>
                          version !== undefined
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
                              "font-mono whitespace-pre-wrap text-sm font-medium text-border mr-2 group-hover:text-foreground",
                              file.isDelete &&
                                "text-red-500 group-hover:text-foreground",
                              file.isIncomplete &&
                                "text-amber-600 group-hover:text-foreground",
                              activeTab === file.name &&
                                isSelectedVersion &&
                                !isCanvas &&
                                "text-foreground",
                            )}
                          >
                            {file.name || "untitled.html"}
                            {file.isIncomplete && " (incomplete)"}
                            {file.isDelete && " (deleted)"}
                          </div>
                        </div>
                        <div className="whitespace-nowrap text-xs text-border opacity-75 group-hover:text-foreground">
                          {formatFileSize(new Blob([file.content]).size)}
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
    );
  });
}
