"use client";

import {
  DirectoryNode,
  FileSystemTree,
  WebContainer,
  WebContainerProcess,
} from "@webcontainer/api";
import React, { useEffect, useState, useRef } from "react";

function buildFileSystemTree(
  files: { name: string | null; content: string }[],
): FileSystemTree {
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

export default function RenderHtmlComponent({
  files,
}: {
  files: { name: string | null; content: string }[];
}) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const webcontainerInstance = useRef<WebContainer | null>(null);
  const previousFiles = useRef<typeof files>([]);
  const serverProcess = useRef<WebContainerProcess | null>(null);

  const handleServerOutput = React.useCallback((data: string) => {
    console.log(data);
  }, []);

  const startServer = React.useCallback(
    async (webcontainer: WebContainer) => {
      // Arrêter le processus précédent si il existe
      if (serverProcess.current) {
        try {
          await serverProcess.current.kill();
        } catch (e) {
          console.warn("Failed to kill previous server process:", e);
        }
      }

      serverProcess.current = await webcontainer.spawn("npm", ["run", "start"]);
      serverProcess.current.output.pipeTo(
        new WritableStream({
          write: handleServerOutput,
        }),
      );

      webcontainer.on("server-ready", (port, url) => {
        console.log("server-ready", port, url);
        setIframeSrc(url);
      });
    },
    [handleServerOutput],
  );

  const updateFiles = React.useCallback(
    async (container: WebContainer, changedFiles: typeof files) => {
      const writePromises = changedFiles
        .filter((file) => file.name)
        .map((file) => container.fs.writeFile(file.name!, file.content));

      await Promise.all(writePromises);
      await startServer(container);
    },
    [startServer],
  );

  useEffect(() => {
    let isInitializing = false;

    const initWebContainer = async () => {
      // Premier démarrage
      if (!webcontainerInstance.current && !isInitializing) {
        isInitializing = true;
        try {
          const webcontainer = await WebContainer.boot();
          webcontainerInstance.current = webcontainer;
          const fileSystemTree = buildFileSystemTree(files);
          console.log("fileSystemTree", fileSystemTree);
          await webcontainer.mount(fileSystemTree);
          await installDependencies(webcontainer);
          await startServer(webcontainer);
        } catch (error) {
          console.error("Error during WebContainer initialization:", error);
        } finally {
          isInitializing = false;
        }
        previousFiles.current = files;
        return;
      }

      // Mise à jour des fichiers
      const container = webcontainerInstance.current;
      if (!container) return;
      console.log("files", files);
      // Vérifier les fichiers modifiés
      const changedFiles = files.filter((file, index) => {
        const prevFile = previousFiles.current[index];
        return (
          prevFile?.content !== file.content || prevFile?.name !== file.name
        );
      });

      if (changedFiles.length === 0) return;

      // Mettre à jour uniquement les fichiers modifiés
      await updateFiles(container, changedFiles);

      previousFiles.current = files;
    };

    const installDependencies = async (webcontainer: WebContainer) => {
      const installProcess = await webcontainer.spawn("npm", ["install"]);
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log(data);
          },
        }),
      );
      return installProcess.exit;
    };

    initWebContainer();

    return () => {
      try {
        webcontainerInstance.current?.teardown();
      } catch (error) {
        console.error("Error during WebContainer teardown:", error);
      }
    };
  }, [files, updateFiles, startServer]);

  return iframeSrc ? (
    <iframe
      src={iframeSrc}
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  ) : (
    <p>Chargement de l’application...</p>
  );
}
