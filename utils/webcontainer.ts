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

class WebContainerInstance {
  private static instance: WebContainer | null = null;

  static async getInstance(): Promise<WebContainer> {
    if (typeof window === "undefined") {
      throw new Error("WebContainer ne peut être utilisé que côté client");
    }

    if (!this.instance) {
      this.instance = await WebContainer.boot({
        coep: "credentialless",
        forwardPreviewErrors: true,
      });
    }
    return this.instance;
  }

  static teardown() {
    if (this.instance) {
      try {
        this.instance.teardown();
      } catch {
        /* empty */
      }
      this.instance = null;
    }
  }
}

export const getPreviewId = (url: string) => {
  const match = url.match(
    /^https?:\/\/([^.]+)\.local-credentialless\.webcontainer-api\.io/,
  );

  if (match) {
    const previewId = match[1];
    return previewId;
  } else {
    console.warn("[Preview] Invalid WebContainer URL:", url);
  }
};

export async function setupProject(files: ChatFile[]) {
  const webcontainer = await WebContainerInstance.getInstance();
  const fileSystemTree = buildFileSystemTree(files);
  await webcontainer.mount(fileSystemTree);
  const installProcess = await webcontainer.spawn("npm", ["install"]);
  await installProcess.exit;
  await webcontainer.spawn("npm", ["run", "dev"]);
  return webcontainer;
}

export function stopWebContainer() {
  WebContainerInstance.teardown();
}
