import { Terminal } from "@xterm/xterm";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { ChatFile } from "@/utils/completion-parser";
import { buildFileSystemTree, getPreviewId } from "@/utils/webcontainer";
import { webcontainer as webcontainerPromise } from "@/utils/webcontainer-instance";

import { useComponentContext } from "./component-context";

type PreviewError = {
  title: string;
  description: string;
  content: string;
};

interface WebContainerContextType {
  terminal: Terminal | null;
  files: ChatFile[];
  setFiles: (files: ChatFile[]) => void;
  error: string | null;
  loadingState: WebContainerLoadingState;
  setLoadingState: (state: WebContainerLoadingState) => void;
  previewError: PreviewError | null;
}

const WebContainerContext = createContext<WebContainerContextType | undefined>(
  undefined,
);

export type WebContainerLoadingState =
  | "initializing"
  | "starting"
  | "error"
  | null;

export const WebContainerProvider = ({ children }: { children: ReactNode }) => {
  const [loadingState, setLoadingState] =
    useState<WebContainerLoadingState>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<PreviewError | null>(null);
  const { setPreviewId, selectedFramework, isLoading } = useComponentContext();

  useEffect(() => {
    setPreviewId(undefined);
    setError(null);
  }, []);

  useEffect(() => {
    const setupProject = async () => {
      setLoadingState("initializing");
      if (selectedFramework === "html" || isLoading) {
        return;
      }
      const webcontainer = await webcontainerPromise;
      if (files.length === 0 || !webcontainer) {
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
            console.log("data written to terminal:", data);
          },
        }),
      );

      const input = shellProcess.input.getWriter();

      newTerminal.onData((data) => {
        input.write(data);
        console.log("data sent to shell process:", data);
      });
      const fileSystemTree = buildFileSystemTree(files);
      await webcontainer.mount(fileSystemTree);

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
                setError(
                  "Tailwind AI can't execute this code, check the terminal and ask AI to fix it.",
                );
              }
            }
          },
        }),
      );
      await devProcess.exit;

      // webcontainer.on("error", (error) => {
      //   setError(`WebContainer error: ${error.message}`);
      //   setLoadingState("error");
      // });

      // webcontainer.on("preview-message", (message) => {
      //   console.log("preview-message", message);
      //   if (
      //     message.type === "PREVIEW_UNCAUGHT_EXCEPTION" ||
      //     message.type === "PREVIEW_UNHANDLED_REJECTION"
      //   ) {
      //     const isPromise = message.type === "PREVIEW_UNHANDLED_REJECTION";
      //     setPreviewError({
      //       title: isPromise
      //         ? "Unhandled Promise Rejection"
      //         : "Uncaught Exception",
      //       description: message.message,
      //       content: `Error occurred at ${message.pathname}${message.search}${message.hash}`,
      //     });
      //   }
      // });

      // webcontainer.on("server-ready", async (port, url) => {
      //   const newPreviewId = getPreviewId(url);
      //   if (newPreviewId) {
      //     setLoadingState(null);
      //     setPreviewId(newPreviewId);
      //   }
      // });
    };

    setupProject();
  }, [files, isLoading]);

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
  }, []);

  return (
    <WebContainerContext.Provider
      value={{
        terminal,
        files,
        setFiles,
        error,
        loadingState,
        setLoadingState,
        previewError,
      }}
    >
      {children}
    </WebContainerContext.Provider>
  );
};

export const useWebContainer = (): WebContainerContextType => {
  const context = useContext(WebContainerContext);
  if (!context) {
    throw new Error(
      "useWebContainer must be used within a WebContainerProvider",
    );
  }
  return context;
};
