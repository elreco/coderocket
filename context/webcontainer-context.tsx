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

  // References for processes and terminal
  const terminalRef = useRef<Terminal | null>(null);
  const shellProcessRef = useRef<WebContainerProcess | null>(null);
  const devProcessRef = useRef<WebContainerProcess | null>(null);

  // Track first-time initialization
  const [isProjectInitialized, setIsProjectInitialized] = useState(false);

  // Store the old artifact files to detect changes
  const oldArtifactFilesRef = useRef<typeof artifactFiles>([]);

  useEffect(() => {
    // Clean up references when unmounting
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

  /**
   * Compare artifact files to detect whether `package.json` content has changed.
   * Returns true if `package.json` content differs (old vs new).
   */
  const hasPackageJsonChanged = (
    oldFiles: typeof artifactFiles,
    newFiles: typeof artifactFiles,
  ) => {
    const oldPkg = oldFiles.find((f) => f.name === "package.json");
    const newPkg = newFiles.find((f) => f.name === "package.json");
    if (!oldPkg && newPkg) return true;
    if (!newPkg && oldPkg) return true;
    if (!oldPkg && !newPkg) return false;
    // Both exist; compare content
    return oldPkg?.content !== newPkg?.content;
  };

  /**
   * Write or update the files in the WebContainer.
   * NOTE: We do not kill dev process — we rely on hot-reload from the dev server.
   */
  const updateFilesInWebContainer = async (
    newFiles: typeof artifactFiles,
    webcontainer: Awaited<typeof webcontainerPromise>,
  ) => {
    for (const file of newFiles) {
      // For simplicity, just overwrite them all. If you want to optimize,
      // you can compare old/new content and only write if changed.
      try {
        await webcontainer.fs.writeFile(file.name || "", file.content);
      } catch (err) {
        console.warn("Failed to write file:", file.name, err);
      }
    }
  };

  /**
   * Main useEffect to handle initialization and subsequent file changes.
   */
  useEffect(() => {
    const setupProject = async () => {
      // If basic conditions are not met, skip
      if (
        selectedVersion === undefined ||
        selectedFramework === Framework.HTML || // If HTML or no bundler, skip
        isLoading ||
        !selectedFramework ||
        artifactFiles.length === 0
      ) {
        return;
      }

      // (Optional) Check if there's an existing server-side component
      const exists = await checkExistingComponent(chatId, selectedVersion);
      if (exists) {
        setLoadingState(null);
        setWebcontainerReady(true);
        setPreviewId(undefined);
        return;
      }
      setWebcontainerReady(false);
      // Grab the shared WebContainer instance
      const webcontainer = await webcontainerPromise;
      if (!webcontainer) return;

      // Initialize the terminal once
      if (!terminalRef.current) {
        terminalRef.current = new Terminal();
      }
      const terminal = terminalRef.current;
      console.log("terminal", terminal);
      // If the project is NOT initialized, do a full "mount + npm install + npm run dev"
      if (!isProjectInitialized) {
        setLoadingState("initializing");

        // Show logs in the terminal
        if (!shellProcessRef.current) {
          // Start a shell to show logs
          shellProcessRef.current = await webcontainer.spawn("jsh");
          // Pipe shell output to the terminal
          shellProcessRef.current.output.pipeTo(
            new WritableStream({
              write(data) {
                terminal.write(data);
                const possibleError = formatBuildError(data);
                if (possibleError) {
                  setBuildError(possibleError);
                }
              },
            }),
          );
          // Pipe terminal input to the shell
          const input = shellProcessRef.current.input.getWriter();
          terminal.onData((data) => {
            input.write(data);
          });
        }

        // 1) Mount the entire file system
        const fileSystemTree = buildFileSystemTree(artifactFiles);
        await webcontainer.mount(fileSystemTree);

        // 2) npm install
        setLoadingState("processing");
        const installProcess = await webcontainer.spawn("npm", ["install"]);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
              const possibleError = formatBuildError(data);
              if (possibleError) {
                setBuildError(possibleError);
              }
            },
          }),
        );
        await installProcess.exit;

        // 3) npm run dev
        setLoadingState("starting");
        devProcessRef.current = await webcontainer.spawn("npm", ["run", "dev"]);
        devProcessRef.current.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
              const possibleError = formatBuildError(data);
              if (possibleError) {
                setBuildError(possibleError);
              }
            },
          }),
        );

        // Mark as initialized
        setIsProjectInitialized(true);
        oldArtifactFilesRef.current = artifactFiles;
      } else {
        //
        // If the project IS already initialized, we only update changed files.
        //
        const packageHasChanged = hasPackageJsonChanged(
          oldArtifactFilesRef.current,
          artifactFiles,
        );

        // 1) Write file changes to the container
        await updateFilesInWebContainer(artifactFiles, webcontainer);

        // 2) If package.json changed, re-run npm install
        if (packageHasChanged) {
          setLoadingState("processing");
          const installProcess = await webcontainer.spawn("npm", ["install"]);
          installProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                terminal.write(data);
                const possibleError = formatBuildError(data);
                if (possibleError) {
                  setBuildError(possibleError);
                }
              },
            }),
          );
          await installProcess.exit;
        }

        // We do NOT kill `npm run dev`. We rely on its watcher/hot reload
        // If your dev script uses Vite/Next/etc., it should pick up changes automatically.

        oldArtifactFilesRef.current = artifactFiles;
      }
    };

    setupProject();
  }, [
    artifactFiles,
    chatId,
    isLoading,
    selectedVersion,
    selectedFramework,
    isProjectInitialized,
  ]);

  /**
   * Handle messages from the "preview" environment (client runtime errors, etc.)
   */
  useEffect(() => {
    webcontainerPromise.then((webcontainer) => {
      if (!webcontainer) return;

      // Listen for uncaught exceptions/rejections from your running code
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

      // Called when the dev server is up and running
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
    "Failed to load url",
    "does the file exist",
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
    return null;
  }

  return {
    title: "Build Error",
    description: errorMessage,
    content: cleanedData,
  };
}
