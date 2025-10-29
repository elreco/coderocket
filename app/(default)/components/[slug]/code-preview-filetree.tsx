import {
  ChevronDown,
  ChevronRight,
  Folder,
  Loader,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";
import * as React from "react";

import { updateArtifactCode } from "@/app/(default)/components/[slug]/actions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComponentContext } from "@/context/component-context";
import { cn } from "@/lib/utils";
import { toggleFileLock } from "@/utils/completion-parser";
import { getFileConfig } from "@/utils/file-extensions";

interface File {
  name: string | null;
  content: string;
  isLocked?: boolean;
}

interface Folder {
  files: File[];
  subFolders: Record<string, Folder>;
}

interface FolderContentProps {
  folder: Folder;
  path: string;
  isLoading: boolean;
  selectedVersion: number;
  handleVersionSelect: (version: number, tabName?: string) => void;
  selectedFramework?: string;
  depth?: number;
  activeTab: string;
  onFileSelect?: () => void;
  openFolders: Record<string, boolean>;
  toggleFolder: (folderPath: string) => void;
  onToggleLock: (filePath: string) => void;
  onBatchToggleLock: (filePaths: string[]) => void;
  allFiles: File[];
  savingFiles: Set<string>;
}

const FolderContent = ({
  folder,
  path,
  isLoading,
  selectedVersion,
  handleVersionSelect,
  selectedFramework,
  depth = 0,
  activeTab,
  onFileSelect,
  openFolders,
  toggleFolder,
  onToggleLock,
  onBatchToggleLock,
  allFiles,
  savingFiles,
}: FolderContentProps) => {
  const sortFiles = React.useCallback((a: File, b: File) => {
    return (a.name || "").localeCompare(b.name || "");
  }, []);

  const sortFolders = React.useCallback(
    ([nameA]: [string, Folder], [nameB]: [string, Folder]) => {
      return nameA.localeCompare(nameB);
    },
    [],
  );

  const sortedFiles = React.useMemo(() => {
    return [...folder.files].sort(sortFiles);
  }, [folder.files, sortFiles]);

  const sortedFolders = React.useMemo(() => {
    return Object.entries(folder.subFolders).sort(sortFolders);
  }, [folder.subFolders, sortFolders]);

  const getAllFilesInFolder = React.useCallback(
    (folderPath: string, folderData: Folder): string[] => {
      const files: string[] = [];
      folderData.files.forEach((file) => {
        if (file.name) {
          const fullFilePath = folderPath
            ? `${folderPath}/${file.name}`
            : file.name;
          files.push(fullFilePath);
        }
      });
      Object.entries(folderData.subFolders).forEach(
        ([subFolderName, subFolder]) => {
          const subPath = folderPath
            ? `${folderPath}/${subFolderName}`
            : subFolderName;
          files.push(...getAllFilesInFolder(subPath, subFolder));
        },
      );
      return files;
    },
    [],
  );

  const handleFolderLock = React.useCallback(
    (folderPath: string, folderData: Folder, shouldLock: boolean) => {
      const filePaths = getAllFilesInFolder(folderPath, folderData);
      const filesToToggle = filePaths.filter((filePath) => {
        const file = allFiles.find((f) => f.name === filePath);
        return (file?.isLocked ?? false) !== shouldLock;
      });
      if (filesToToggle.length > 0) {
        onBatchToggleLock(filesToToggle);
      }
    },
    [getAllFilesInFolder, onBatchToggleLock, allFiles],
  );

  return (
    <div className="w-full">
      {sortedFolders.map(([subFolderName, subFolder]) => {
        const fullPath = path ? `${path}/${subFolderName}` : subFolderName;
        const isOpen = openFolders[fullPath] ?? true;
        const allFolderFiles = getAllFilesInFolder(fullPath, subFolder);
        const allLocked =
          allFolderFiles.length > 0 &&
          allFolderFiles.every((filePath) => {
            const file = allFiles.find((f) => f.name === filePath);
            return file?.isLocked === true;
          });
        return (
          <div key={fullPath} className="group relative">
            <div className="flex items-center">
              <button
                onClick={() => toggleFolder(fullPath)}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-accent"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
              >
                {isOpen ? (
                  <ChevronDown className="size-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0" />
                )}
                <Folder className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{subFolderName}</span>
              </button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderLock(fullPath, subFolder, !allLocked);
                      }}
                      disabled={isLoading}
                      className="absolute right-1 opacity-0 transition-opacity disabled:cursor-not-allowed group-hover:opacity-100"
                    >
                      {allLocked ? (
                        <Lock className="size-3.5 text-primary" />
                      ) : (
                        <Unlock className="size-3.5 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {allLocked
                        ? "Unlock all files in this folder"
                        : "Lock all files in this folder to prevent AI modifications"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {isOpen && (
              <FolderContent
                folder={subFolder}
                path={fullPath}
                isLoading={isLoading}
                selectedVersion={selectedVersion}
                handleVersionSelect={handleVersionSelect}
                selectedFramework={selectedFramework}
                depth={depth + 1}
                activeTab={activeTab}
                onFileSelect={onFileSelect}
                openFolders={openFolders}
                toggleFolder={toggleFolder}
                onToggleLock={onToggleLock}
                onBatchToggleLock={onBatchToggleLock}
                allFiles={allFiles}
                savingFiles={savingFiles}
              />
            )}
          </div>
        );
      })}

      {sortedFiles.map((file) => {
        const fileConfig = getFileConfig(
          file.name || "untitled.html",
          selectedFramework,
        );
        const FileIcon = fileConfig.icon;
        const fullPath = path ? `${path}/${file.name}` : file.name || undefined;
        const isActive = activeTab === fullPath;
        return (
          <div key={fullPath} className="group relative flex items-center">
            <button
              onClick={() => {
                handleVersionSelect(selectedVersion, fullPath);
                onFileSelect?.();
              }}
              disabled={isLoading}
              className={cn(
                "flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
              )}
              style={{ paddingLeft: `${depth * 12 + 22}px` }}
            >
              <FileIcon className={cn("size-4 shrink-0", fileConfig.color)} />
              <span className="flex-1 truncate text-left">{file.name}</span>
            </button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (fullPath) {
                        onToggleLock(fullPath);
                      }
                    }}
                    disabled={
                      isLoading || (!!fullPath && savingFiles.has(fullPath))
                    }
                    className="absolute right-1 opacity-0 transition-opacity disabled:cursor-not-allowed group-hover:opacity-100"
                  >
                    {fullPath && savingFiles.has(fullPath) ? (
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                    ) : file.isLocked ? (
                      <Lock className="size-3.5 text-primary" />
                    ) : (
                      <Unlock className="size-3.5 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {fullPath && savingFiles.has(fullPath)
                      ? "Saving..."
                      : file.isLocked
                        ? "Unlock file to allow AI modifications"
                        : "Lock file to prevent AI modifications"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      })}
    </div>
  );
};

const organizeFilesByFolder = (files: File[]): { root: Folder } => {
  const fileTree: { root: Folder } = {
    root: { files: [], subFolders: {} },
  };

  files.forEach((file) => {
    if (!file.name) {
      fileTree.root.files.push(file);
      return;
    }

    const parts = file.name.split("/");
    if (parts.length === 1) {
      fileTree.root.files.push(file);
    } else {
      let currentLevel = fileTree.root;
      const folderParts = parts.slice(0, -1);

      folderParts.forEach((folder) => {
        if (!currentLevel.subFolders[folder]) {
          currentLevel.subFolders[folder] = {
            files: [],
            subFolders: {},
          };
        }
        currentLevel = currentLevel.subFolders[folder];
      });

      currentLevel.files.push({
        ...file,
        name: parts[parts.length - 1],
      });
    }
  });

  return fileTree;
};

export function CodePreviewFileTree({
  onFileSelect,
}: {
  onFileSelect?: () => void;
}) {
  const {
    isLoading,
    selectedVersion,
    artifactFiles,
    activeTab,
    handleVersionSelect,
    selectedFramework,
    artifactCode,
    setArtifactCode,
    chatId,
  } = useComponentContext();

  const [localFiles, setLocalFiles] = React.useState(artifactFiles);
  const [savingFiles, setSavingFiles] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setLocalFiles(artifactFiles);
  }, [artifactFiles]);

  const [openFolders, setOpenFolders] = React.useState<Record<string, boolean>>(
    {},
  );

  const toggleFolder = React.useCallback((folderPath: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderPath]: prev[folderPath] === undefined ? false : !prev[folderPath],
    }));
  }, []);

  const handleToggleLock = React.useCallback(
    async (filePath: string) => {
      setSavingFiles((prev) => new Set(prev).add(filePath));

      setLocalFiles((prevFiles) => {
        return prevFiles.map((file) =>
          file.name === filePath ? { ...file, isLocked: !file.isLocked } : file,
        );
      });

      const updatedCode = toggleFileLock(artifactCode, filePath);
      setArtifactCode(updatedCode);

      try {
        await updateArtifactCode(chatId, updatedCode, selectedVersion);
      } catch (error) {
        console.error("Failed to save lock state:", error);
      } finally {
        setSavingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(filePath);
          return newSet;
        });
      }
    },
    [artifactCode, setArtifactCode, chatId, selectedVersion],
  );

  const handleBatchToggleLock = React.useCallback(
    async (filePaths: string[]) => {
      filePaths.forEach((filePath) => {
        setSavingFiles((prev) => new Set(prev).add(filePath));
      });

      setLocalFiles((prevFiles) => {
        return prevFiles.map((file) =>
          filePaths.includes(file.name || "")
            ? { ...file, isLocked: !file.isLocked }
            : file,
        );
      });

      let updatedCode = artifactCode;
      filePaths.forEach((filePath) => {
        updatedCode = toggleFileLock(updatedCode, filePath);
      });
      setArtifactCode(updatedCode);

      try {
        await updateArtifactCode(chatId, updatedCode, selectedVersion);
      } catch (error) {
        console.error("Failed to save lock state:", error);
      } finally {
        filePaths.forEach((filePath) => {
          setSavingFiles((prev) => {
            const newSet = new Set(prev);
            newSet.delete(filePath);
            return newSet;
          });
        });
      }
    },
    [artifactCode, setArtifactCode, chatId, selectedVersion],
  );

  const organizedFiles = React.useMemo(() => {
    return organizeFilesByFolder(localFiles);
  }, [localFiles]);

  if (artifactFiles.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader className="size-4 animate-spin" />
        <span>Loading files...</span>
      </div>
    );
  }

  return (
    <div className="w-full py-2">
      <FolderContent
        folder={organizedFiles.root}
        path=""
        isLoading={isLoading}
        selectedVersion={selectedVersion ?? 0}
        handleVersionSelect={handleVersionSelect}
        selectedFramework={selectedFramework}
        activeTab={activeTab}
        onFileSelect={onFileSelect}
        openFolders={openFolders}
        toggleFolder={toggleFolder}
        onToggleLock={handleToggleLock}
        onBatchToggleLock={handleBatchToggleLock}
        allFiles={localFiles}
        savingFiles={savingFiles}
      />
    </div>
  );
}
