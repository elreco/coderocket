"use client";

import { DirectoryNode, FileSystemTree, WebContainer } from "@webcontainer/api";

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

let webcontainer: WebContainer | null = null;

async function bootWebContainer() {
  if (webcontainer) return webcontainer;
  /* auth.init({
    clientId: "wc_api_elreco_626e67a60beb190de73c04873753f3d4",
    scope: "",
  }); */
  webcontainer = await WebContainer.boot();
}

export function stopWebContainer() {
  if (webcontainer) {
    try {
      webcontainer.teardown();
    } catch {
      /* empty */
    }
    webcontainer = null;
  }
}

export async function setupProject(files: ChatFile[]) {
  await bootWebContainer();
  const fileSystemTree = buildFileSystemTree(files);
  await webcontainer?.mount(fileSystemTree);
  const installProcess = await webcontainer?.spawn("npm", ["install"]);
  await installProcess?.exit;
  await webcontainer?.spawn("npm", ["run", "dev"]);
  return webcontainer;
}
