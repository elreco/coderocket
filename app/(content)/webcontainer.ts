"use client";

import { DirectoryNode, FileSystemTree, WebContainer } from "@webcontainer/api";

import { ChatFile } from "@/utils/completion-parser";

function buildFileSystemTree(files: ChatFile[]): FileSystemTree {
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

let webcontainerInstance: WebContainer | null = null;

export async function getWebContainer() {
  if (webcontainerInstance) return webcontainerInstance;
  webcontainerInstance = await WebContainer.boot();
  return webcontainerInstance;
}

export function teardownWebContainer() {
  if (webcontainerInstance) {
    webcontainerInstance.teardown();
    webcontainerInstance = null;
  }
}

export async function setupProject(files: ChatFile[]) {
  const webcontainer = await getWebContainer();

  const fileSystemTree = buildFileSystemTree(files);
  await webcontainer?.mount(fileSystemTree);

  const installProcess = await webcontainer?.spawn("npm", ["install"]);
  await installProcess?.exit;

  return webcontainer;
}
