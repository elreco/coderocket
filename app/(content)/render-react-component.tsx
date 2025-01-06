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

  useEffect(() => {
    const initWebContainer = async () => {
      // Vérifier si une instance existe déjà
      if (webcontainerInstance.current || files.length === 0) {
        console.log("WebContainer instance already exists");
        return;
      }
      console.log(files);
      // Initialisation de WebContainer
      const webcontainer = await WebContainer.boot();
      webcontainerInstance.current = webcontainer;

      // Transformation des fichiers en FileSystemTree
      const fileSystemTree = buildFileSystemTree(files);

      // Montage des fichiers
      await webcontainer.mount(fileSystemTree);
      console.log(fileSystemTree);
      // Installation des dépendances
      const installProcess = await webcontainer.spawn("npm", ["install"]);
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log(data);
          },
        }),
      );
      await installProcess.exit;
      console.log("installProcess", installProcess);
      // Démarrage du serveur de développement
      const startProcess = await webcontainer.spawn("npm", ["run", "start"]);
      startProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log(data);
          },
        }),
      );

      // Écoute de l'événement 'server-ready'
      webcontainer.on("server-ready", (port, url) => {
        console.log("server-ready", port, url);
        setIframeSrc(url);
      });
      webcontainer.on("error", (error) => {
        console.log("error", error);
      });
      webcontainer.on("port", (port) => {
        console.log("port", port);
      });
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
