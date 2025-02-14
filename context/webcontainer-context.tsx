"use client";

import { WebContainerProcess } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import stripAnsi from "strip-ansi";

import { checkExistingComponent } from "@/app/(default)/components/[slug]/actions";
import { webcontainer as webcontainerPromise } from "@/lib/webcontainer";
import { Framework } from "@/utils/config";
import { buildFileSystemTree, getPreviewId } from "@/utils/webcontainer";

import { useComponentContext } from "./component-context";

type PreviewError = {
  title: string;
  description: string;
  content: string;
};

interface WebcontainerContextType {
  terminal: Terminal | null;
  error: string | null;
  loadingState: WebcontainerLoadingState;
  setLoadingState: (state: WebcontainerLoadingState) => void;
  previewError: PreviewError | null;
  previewId: string | undefined;
  buildError: PreviewError | null;
}

const WebcontainerContext = createContext<WebcontainerContextType | undefined>(
  undefined,
);

export type WebcontainerLoadingState =
  | "initializing"
  | "deploying"
  | "starting"
  | "processing"
  | null;

export const WebcontainerProvider = ({ children }: { children: ReactNode }) => {
  const [loadingState, setLoadingState] =
    useState<WebcontainerLoadingState>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<PreviewError | null>(null);
  const [previewId, setPreviewId] = useState<string | undefined>(undefined);
  const [buildError, setBuildError] = useState<PreviewError | null>(null);

  const {
    selectedFramework,
    isLoading,
    selectedVersion,
    setWebcontainerReady,
    chatId,
    artifactFiles,
  } = useComponentContext();

  // Références pour stocker le terminal et les processus
  const terminalRef = useRef<Terminal | null>(null);
  const shellProcessRef = useRef<WebContainerProcess | null>(null); // Remplacez `any` par le type approprié
  const devProcessRef = useRef<WebContainerProcess | null>(null); // Remplacez `any` par le type approprié

  // On stocke le contenu précédent de package.json pour le comparer.
  const prevPackageJsonRef = useRef<string>("");

  // Permet de savoir si le dev process tourne déjà (ou a déjà tourné) dans cette session
  const [devStarted, setDevStarted] = useState(false);

  // Récupère le contenu texte du package.json dans la liste des fichiers.
  const getPackageJsonContent = () => {
    const pkgFile = artifactFiles.find((file) => file.name === "package.json");
    return pkgFile?.content || "";
  };

  // Nettoyage initial
  useEffect(() => {
    setPreviewId(undefined);
    setError(null);
    setBuildError(null);
    setLoadingState(null);
    setWebcontainerReady(false);
  }, [setWebcontainerReady]);

  // Nettoyer le terminal et les processus lors du démontage du composant
  useEffect(() => {
    return () => {
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
      if (shellProcessRef.current) {
        shellProcessRef.current.kill();
        shellProcessRef.current = null;
      }
      if (devProcessRef.current) {
        devProcessRef.current.kill();
        devProcessRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const setupProject = async () => {
      setLoadingState("initializing");
      setWebcontainerReady(false);

      if (
        selectedVersion === undefined ||
        selectedFramework === Framework.HTML ||
        isLoading ||
        !selectedFramework ||
        artifactFiles.length === 0
      ) {
        console.log("WebcontainerContext: setupProject: return");
        return;
      }

      // Vérifie si on a déjà quelque chose d'existant côté serveur
      const exists = await checkExistingComponent(chatId, selectedVersion);
      if (exists) {
        setLoadingState(null);
        setWebcontainerReady(true);
        setPreviewId(undefined);
        return;
      }

      // Instancie le Webcontainer
      const webcontainer = await webcontainerPromise;
      if (!webcontainer) return;

      // Initialise le Terminal s'il n'existe pas déjà
      if (!terminalRef.current) {
        terminalRef.current = new Terminal();
      }

      const terminal = terminalRef.current;

      // Nettoie les processus existants
      /* if (shellProcessRef.current) {
        shellProcessRef.current.kill();
        shellProcessRef.current = null;
      }
      if (devProcessRef.current) {
        devProcessRef.current.kill();
        devProcessRef.current = null;
      } */

      // Réinitialise le terminal
      terminal.reset(); // Efface les anciens logs

      // Lance un shell jsh pour afficher la sortie
      shellProcessRef.current = await webcontainer.spawn("jsh");
      shellProcessRef.current.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
            const buildError = formatBuildError(data);
            if (buildError) {
              setBuildError(buildError); // Met à jour setBuildError uniquement si une erreur est détectée
            }
          },
        }),
      );
      const input = shellProcessRef.current.input.getWriter();
      terminal.onData((data) => {
        input.write(data);
      });

      // Monte tous les fichiers (dont package.json)
      const fileSystemTree = buildFileSystemTree(artifactFiles);
      await webcontainer.mount(fileSystemTree);

      // Compare la version actuelle du package.json
      const currentPkg = getPackageJsonContent();
      const hasPackageChanged = currentPkg !== prevPackageJsonRef.current;

      // Met à jour le "record" du package.json
      prevPackageJsonRef.current = currentPkg;

      // S'il a changé ou si on n'a jamais fait de npm install, on l'exécute
      if (hasPackageChanged) {
        setLoadingState("processing");
        const installProcess = await webcontainer.spawn("npm", ["install"]);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
              const buildError = formatBuildError(data);
              if (buildError) {
                setBuildError(buildError); // Met à jour setBuildError uniquement si une erreur est détectée
              }
            },
          }),
        );
        await installProcess.exit;
      }

      // S'il a changé ou si on n'a jamais démarré npm run dev, on le lance
      if (!devStarted || hasPackageChanged) {
        setLoadingState("starting");
        devProcessRef.current = await webcontainer.spawn("npm", ["run", "dev"]);
      }
      if (devProcessRef.current) {
        devProcessRef.current.output.pipeTo(
          new WritableStream({
            write(data) {
              if (data) {
                terminal.write(data);
                const buildError = formatBuildError(data);
                if (buildError) {
                  setBuildError(buildError); // Met à jour setBuildError uniquement si une erreur est détectée
                }
              }
            },
          }),
        );
        setDevStarted(true);
        await devProcessRef.current.exit;
      }
    };

    setupProject();
  }, [artifactFiles, isLoading, chatId]);

  // Gère les erreurs en mode 'preview' (messages envoyés par l'appli via le port)
  useEffect(() => {
    webcontainerPromise.then((webcontainer) => {
      webcontainer.on("preview-message", (message) => {
        if (
          message.type === "PREVIEW_UNCAUGHT_EXCEPTION" ||
          message.type === "PREVIEW_UNHANDLED_REJECTION"
        ) {
          const isPromise = message.type === "PREVIEW_UNHANDLED_REJECTION";
          setPreviewError({
            title: isPromise
              ? "Unhandled Promise Rejection"
              : "Uncaught Exception",
            description: message.message,
            content: `Error occurred at ${message.pathname}${message.search}${message.hash}`,
          });
        }
      });

      webcontainer.on("server-ready", async (port, url) => {
        const newPreviewId = getPreviewId(url);
        if (newPreviewId) {
          setLoadingState(null);
          setPreviewId(newPreviewId);
          setBuildError(null); // Nettoie l'erreur de build si le serveur est prêt
          setError(null);
        }
      });
    });
  }, [selectedVersion, selectedFramework]);

  return (
    <WebcontainerContext.Provider
      value={{
        terminal: terminalRef.current,
        error,
        loadingState,
        setLoadingState,
        previewError,
        previewId,
        buildError,
      }}
    >
      {children}
    </WebcontainerContext.Provider>
  );
};

export const useWebcontainer = (): WebcontainerContextType => {
  const context = useContext(WebcontainerContext);
  if (!context) {
    throw new Error(
      "useWebcontainer must be used within a WebcontainerProvider",
    );
  }
  return context;
};

function formatBuildError(data: string): PreviewError | null {
  const cleanedData = stripAnsi(data);
  const errorPatterns = [
    "error",
    "npm ERR!",
    "Failed to compile",
    "ERROR in",
    "ENOENT",
    "Cannot find module",
    "Module not found",
    "SyntaxError",
    "Import error",
    "webpack.config.js",
    "fatal",
    "Error:",
    "error TS",
    "Property '",
    "RollupError",
    "error during build",
    "Could not resolve",
    "Failed to load url", // Ajouté pour capturer les erreurs de chargement de fichier
    "does the file exist", // Ajouté pour capturer les erreurs de fichier manquant
  ];

  let errorMessage = "";
  let hasError = false;

  errorPatterns.forEach((pattern) => {
    if (cleanedData.toLowerCase().includes(pattern.toLowerCase())) {
      errorMessage += `- ${pattern} detected\n`;
      hasError = true;
    }
  });

  if (!hasError) {
    return null; // Retourne null si aucune erreur n'est détectée
  }

  console.log(errorMessage);

  return {
    title: "Build Error",
    description: errorMessage,
    content: cleanedData,
  };
}
