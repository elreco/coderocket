"use client";

import { DirectoryNode, FileSystemTree, WebContainer } from "@webcontainer/api";
import React, { useEffect, useState, useRef } from "react";

function buildFileSystemTree(
  files: { name: string | null; content: string }[],
): FileSystemTree {
  const tree: FileSystemTree = {};

  files.forEach((file) => {
    if (file.name) {
      const parts = file.name.split("/"); // Découper le chemin en parties (dossiers et fichier)
      let current = tree;

      // Parcourir chaque partie du chemin
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        // Si c'est le dernier élément, c'est un fichier
        if (i === parts.length - 1) {
          current[part] = { file: { contents: file.content } };
        } else {
          // Si ce n'est pas un fichier, créer un dossier s'il n'existe pas
          current[part] = current[part] || { directory: {} };
          current = (current[part] as DirectoryNode).directory;
        }
      }
    }
  });

  return tree;
}

export default function RenderHtmlComponent({
  files,
}: {
  files: { name: string | null; content: string }[];
}) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const webcontainerInstance = useRef<WebContainer | null>(null);
  console.log("files", files);
  useEffect(() => {
    let isInitializing = false;

    const initWebContainer = async () => {
      if (
        webcontainerInstance.current ||
        files.length === 0 ||
        isInitializing
      ) {
        console.log("WebContainer instance already exists or initializing");
        return;
      }

      isInitializing = true;

      try {
        const webcontainer = await WebContainer.boot();
        webcontainerInstance.current = webcontainer;

        const fileSystemTree = buildFileSystemTree(files);
        await webcontainer.mount(fileSystemTree);

        const installProcess = await webcontainer.spawn("npm", ["install"]);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log(data);
            },
          }),
        );
        await installProcess.exit;

        const startProcess = await webcontainer.spawn("npm", ["run", "dev"]);
        startProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log(data);
            },
          }),
        );

        webcontainer.on("server-ready", (port, url) => {
          console.log("server-ready", port, url);
          setIframeSrc(url);
        });
      } catch (error) {
        console.error("Error during WebContainer initialization:", error);
      } finally {
        isInitializing = false;
      }
    };

    initWebContainer();

    return () => {
      webcontainerInstance.current?.teardown();
    };
  }, [files]);

  return iframeSrc ? (
    <iframe
      src={iframeSrc}
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  ) : (
    <p>Chargement de l’application...</p>
  );
}
