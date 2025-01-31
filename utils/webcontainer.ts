"use client";

import { DirectoryNode, FileSystemTree } from "@webcontainer/api";

import { ChatFile } from "@/utils/completion-parser";

export function buildFileSystemTree(files: ChatFile[]): FileSystemTree {
  return files.reduce((tree: FileSystemTree, file) => {
    if (!file.name) return tree;

    const parts = file.name.split("/");
    let current = tree;

    parts.slice(0, -1).forEach((part) => {
      current[part] = current[part] || { directory: {} };
      current = (current[part] as DirectoryNode).directory;
    });

    const fileName = parts[parts.length - 1];
    current[fileName] = { file: { contents: file.content } };

    return tree;
  }, {});
}

export const getPreviewId = (url: string) => {
  const match = url.match(
    /^https?:\/\/([^.]+)\.local-credentialless\.webcontainer-api\.io/,
  );

  if (match) {
    const isWebcontainerReady = match[1];
    return isWebcontainerReady;
  } else {
    console.warn("[Preview] Invalid WebContainer URL:", url);
  }
};
