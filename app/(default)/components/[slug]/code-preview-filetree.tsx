import { ChevronDown, Folder, Files } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}

const FolderContent = ({
  folder,
  path,
  isLoading,
  selectedVersion,
  handleVersionSelect,
}: FolderContentProps) => {
  // Mémoriser les fonctions de tri
  const sortFiles = React.useCallback((a: File, b: File) => {
    return (a.name || "").localeCompare(b.name || "");
  }, []);

  const sortFolders = React.useCallback(
    ([nameA]: [string, Folder], [nameB]: [string, Folder]) => {
      return nameA.localeCompare(nameB);
    },
    [],
  );

  // Mémoriser les listes triées
  const sortedFiles = React.useMemo(() => {
    return [...folder.files].sort(sortFiles);
  }, [folder.files, sortFiles]);

  const sortedFolders = React.useMemo(() => {
    return Object.entries(folder.subFolders).sort(sortFolders);
  }, [folder.subFolders, sortFolders]);

  return (
    <>
      {/* Afficher d'abord les dossiers triés */}
      {sortedFolders.map(([subFolderName, subFolder]) => (
        <DropdownMenuSub key={`${path}/${subFolderName}`}>
          <DropdownMenuSubTrigger className="flex cursor-pointer items-center gap-2">
            <Folder className="size-4 text-muted-foreground" />
            {subFolderName}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <FolderContent
              folder={subFolder}
              path={path ? `${path}/${subFolderName}` : subFolderName}
              isLoading={isLoading}
              selectedVersion={selectedVersion}
              handleVersionSelect={handleVersionSelect}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ))}

      {/* Ensuite afficher les fichiers triés */}
      {sortedFiles.map((file) => {
        const fileConfig = getFileConfig(file.name || "untitled.html");
        const FileIcon = fileConfig.icon;
        const fullPath = path ? `${path}/${file.name}` : file.name || undefined;
        return (
          <DropdownMenuItem
            key={fullPath}
            onClick={() => handleVersionSelect(selectedVersion, fullPath)}
            disabled={isLoading}
            className="flex cursor-pointer items-center gap-2"
          >
            <FileIcon className={cn("size-4", fileConfig.color)} />
            {file.name}
          </DropdownMenuItem>
        );
      })}
    </>
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

export function CodePreviewFileTree() {
  const {
    isLoading,
    selectedVersion,
    artifactFiles,
    activeTab,
    handleVersionSelect,
  } = useComponentContext();
  const organizedFiles = React.useMemo(() => {
    return organizeFilesByFolder(artifactFiles);
  }, [artifactFiles]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex cursor-pointer items-center gap-2"
        >
          <Files className="size-4" />
          {activeTab}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <FolderContent
          folder={organizedFiles.root}
          path=""
          isLoading={isLoading}
          selectedVersion={selectedVersion}
          handleVersionSelect={handleVersionSelect}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
