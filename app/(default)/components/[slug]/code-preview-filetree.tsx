import { ChevronDown, ChevronRight, Folder, Loader } from "lucide-react";
import * as React from "react";

import { useComponentContext } from "@/context/component-context";
import { cn } from "@/lib/utils";
import { getFileConfig } from "@/utils/file-extensions";

interface File {
  name: string | null;
  content: string;
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

  return (
    <div className="w-full">
      {sortedFolders.map(([subFolderName, subFolder]) => {
        const fullPath = path ? `${path}/${subFolderName}` : subFolderName;
        const isOpen = openFolders[fullPath] ?? true;
        return (
          <div key={fullPath}>
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
          <button
            key={fullPath}
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
            <span className="truncate">{file.name}</span>
          </button>
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
  } = useComponentContext();

  const [openFolders, setOpenFolders] = React.useState<Record<string, boolean>>(
    {},
  );

  const toggleFolder = React.useCallback((folderPath: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderPath]: prev[folderPath] === undefined ? false : !prev[folderPath],
    }));
  }, []);

  const organizedFiles = React.useMemo(() => {
    return organizeFilesByFolder(artifactFiles);
  }, [artifactFiles]);

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
      />
    </div>
  );
}
