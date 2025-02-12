"use client";

import { Terminal } from "@xterm/xterm";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
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

  useEffect(() => {
    setPreviewId(undefined);
    setError(null);
    setBuildError(null);
    setLoadingState(null);
    setWebcontainerReady(false);
    setPreviewId(undefined);
    setError(null);
    setBuildError(null);
  }, []);

  useEffect(() => {
    const setupProject = async () => {
      setLoadingState("initializing");
      setWebcontainerReady(false);
      if (selectedVersion === undefined) {
        return;
      }

      if (
        selectedFramework === Framework.HTML ||
        isLoading ||
        selectedVersion === undefined ||
        !selectedFramework ||
        artifactFiles.length === 0
      ) {
        return;
      }
      const exists = await checkExistingComponent(chatId, selectedVersion);
      if (exists) {
        setLoadingState(null);
        setWebcontainerReady(true);
        setPreviewId(undefined);
        return;
      }
      const webcontainer = await webcontainerPromise;
      if (!webcontainer) {
        return;
      }
      const newTerminal = new Terminal();
      setTerminal(newTerminal);
      if (!newTerminal) {
        throw new Error("Instance or terminal not found");
      }
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
      const fileSystemTree = buildFileSystemTree(artifactFiles);
      await webcontainer.mount(fileSystemTree);
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
      const devProcess = await webcontainer.spawn("npm", ["run", "dev"]);
      setLoadingState("starting");
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
    };

    setupProject();
  }, [artifactFiles, isLoading]);

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
