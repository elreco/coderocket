"use client";

import { Terminal } from "@xterm/xterm";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";

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
  const [terminal, setTerminal] = useState<Terminal | null>(null);
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

  // On stocke le contenu précédent de package.json pour le comparer.
  // C'est un Ref pour garder la valeur persistante entre les rendus.
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

      // Initialise le Terminal
      const newTerminal = new Terminal();
      setTerminal(newTerminal);
      if (!newTerminal) {
        throw new Error("Instance or terminal not found");
      }

      // Lance un shell jsh pour afficher la sortie
      const shellProcess = await webcontainer.spawn("jsh");
      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            newTerminal.write(data);
          },
        }),
      );
      const input = shellProcess.input.getWriter();
      newTerminal.onData((data) => {
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

      // S’il a changé ou si on n’a jamais fait de npm install, on l’exécute
      if (hasPackageChanged) {
        setLoadingState("processing");
        const installProcess = await webcontainer.spawn("npm", ["install"]);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              newTerminal.write(data);
            },
          }),
        );
        await installProcess.exit;
      } else {
        // On skip l'install
        newTerminal.writeln(
          "\r\n[Webcontainer] package.json inchangé, skip npm install.",
        );
      }

      // S’il a changé ou si on n’a jamais démarré npm run dev, on le lance
      if (!devStarted || hasPackageChanged) {
        setLoadingState("starting");
        const devProcess = await webcontainer.spawn("npm", ["run", "dev"]);
        setDevStarted(true);
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              if (data) {
                newTerminal.write(data);
                if (data.includes("ERROR") || data.includes("Error")) {
                  /* setBuildError({
                    title: "Build Error",
                    description:
                      "Tailwind AI can't execute this code, check the terminal and ask AI to fix it.",
                    content: data,
                  }); */
                }
              }
            },
          }),
        );
        await devProcess.exit;
      } else {
        // On skip le dev s’il a déjà tourné et si le package.json n’a pas changé
        newTerminal.writeln(
          "\r\n[Webcontainer] package.json inchangé, skip npm run dev.",
        );
      }
    };

    setupProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactFiles, isLoading]);

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
          setBuildError(null);
          setError(null);
        }
      });
    });
  }, [selectedVersion, selectedFramework]);

  return (
    <WebcontainerContext.Provider
      value={{
        terminal,
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
