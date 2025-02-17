"use client";

import { WebContainerProcess } from "@webcontainer/api";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import stripAnsi from "strip-ansi";

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
    isWebcontainerReady,
  } = useComponentContext();

  // References to hold the active processes and terminal
  const shellProcessRef = useRef<WebContainerProcess | null>(null);
  const devProcessRef = useRef<WebContainerProcess | null>(null);

  // Keep track of the old artifact files so we can detect if package.json changed
  const oldArtifactFilesRef = useRef<typeof artifactFiles>([]);

  useEffect(() => {
    // Cleanup everything when unmounting
    return () => {
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
   */
  const hasPackageJsonChanged = (
    oldFiles: typeof artifactFiles,
    newFiles: typeof artifactFiles,
  ) => {
    const oldPkg = oldFiles.find((f) => f.name === "package.json");
    const newPkg = newFiles.find((f) => f.name === "package.json");

    // Handle cases where package.json might not exist in old or new files
    if (!oldPkg && newPkg) return true; // New package.json added
    if (!newPkg && oldPkg) return true; // package.json removed
    if (!oldPkg && !newPkg) return false; // No package.json in either

    // Both exist; compare content
    return oldPkg?.content !== newPkg?.content;
  };

  const addToBuildError = (data: string) => {
    const possibleError = formatBuildError(data);
    if (possibleError) {
      setBuildError((prevError) => {
        if (!prevError) return possibleError;
        return {
          ...prevError,
          description: prevError.description,
          content: prevError.content + possibleError.content,
        };
      });
    }
  };

  /**
   * The main effect that re-initializes everything whenever `artifactFiles` changes.
   */
  useEffect(() => {
    const setupProject = async () => {
      // Basic checks
      if (
        selectedVersion === undefined ||
        selectedFramework === Framework.HTML || // If HTML or no bundler
        isLoading ||
        !selectedFramework ||
        artifactFiles.length === 0
      ) {
        return;
      }

      // Check if the artifact files have changed based on their content
      const filesChanged = !artifactFiles.every((file, index) => {
        const oldFile = oldArtifactFilesRef.current[index];
        return (
          oldFile &&
          file.name === oldFile.name &&
          file.content === oldFile.content
        );
      });

      if (!filesChanged) {
        return;
      }

      setPreviewId(undefined);
      setLoadingState("initializing");
      setWebcontainerReady(false);
      if (isWebcontainerReady) {
        setLoadingState(null);
        setWebcontainerReady(true);

        return;
      }
      // 1) Kill old processes
      if (shellProcessRef.current) {
        shellProcessRef.current.kill();
        shellProcessRef.current = null;
      }
      if (devProcessRef.current) {
        devProcessRef.current.kill();
        devProcessRef.current = null;
      }

      // 4) Grab the WebContainer instance
      const webcontainer = await webcontainerPromise;
      if (!webcontainer) return;

      // 5) Spawn a new shell process to show logs

      shellProcessRef.current = await webcontainer.spawn("jsh");
      shellProcessRef.current.output.pipeTo(
        new WritableStream({
          write(data) {
            addToBuildError(data);
          },
        }),
      );

      // 6) Mount/update all files
      const fsTree = buildFileSystemTree(artifactFiles);
      await webcontainer.mount(fsTree);

      // 7) If package.json changed, run "npm install"
      const packageChanged = hasPackageJsonChanged(
        oldArtifactFilesRef.current,
        artifactFiles,
      );
      if (packageChanged) {
        setLoadingState("processing");
        const installProcess = await webcontainer.spawn("npm", ["install"]);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              addToBuildError(data);
            },
          }),
        );
        await installProcess.exit;
      }

      // 8) Always run "npm run dev"
      setLoadingState("starting");
      devProcessRef.current = await webcontainer.spawn("npm", ["run", "dev"]);
      devProcessRef.current.output.pipeTo(
        new WritableStream({
          write(data) {
            addToBuildError(data);
          },
        }),
      );

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

      // The dev server is up and running
      webcontainer.on("server-ready", async (port, url) => {
        const newPreviewId = getPreviewId(url);
        if (newPreviewId) {
          setLoadingState(null);
          setPreviewId(newPreviewId);
          setBuildError(null);
          setError(null);
        }
      });

      // Save current files as "old" so we can detect package.json changes next time
      oldArtifactFilesRef.current = artifactFiles;
    };

    setupProject();
  }, [artifactFiles, isLoading, selectedFramework, selectedVersion, chatId]);

  return (
    <WebcontainerContext.Provider
      value={{
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

// Utility to detect build errors
function formatBuildError(data: string): PreviewError | null {
  const cleanedData = stripAnsi(data);
  console.log("cleanedData", cleanedData);

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
    "Uncaught ReferenceError",
    "error during build",
    "Could not resolve",
    "Failed to load url",
    "does the file exist",
  ];

  let hasError = false;

  for (const pattern of errorPatterns) {
    if (cleanedData.toLowerCase().includes(pattern.toLowerCase())) {
      hasError = true;
      break;
    }
  }

  if (!hasError) {
    return null;
  }

  // Limiter l'affichage des erreurs à 5 lignes maximum
  const truncatedContent = cleanedData.split("\n").slice(0, 20).join("\n");

  return {
    title: "Build Error",
    description: "An error occurred during build.",
    content: truncatedContent,
  };
}
