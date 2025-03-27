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

import {
  useComponentContext,
  WebcontainerLoadingState,
} from "./component-context";

type BuildError = {
  title: string;
  description: string;
  content: string;
};

interface WebcontainerContextType {
  loadingState: WebcontainerLoadingState;
  setLoadingState: (state: WebcontainerLoadingState) => void;
  previewId: string | undefined;
  buildError: BuildError | null;
}

const WebcontainerContext = createContext<WebcontainerContextType | undefined>(
  undefined,
);

export const WebcontainerProvider = ({ children }: { children: ReactNode }) => {
  const [previewId, setPreviewId] = useState<string | undefined>(undefined);
  const [buildError, setBuildError] = useState<BuildError | null>(null);

  const {
    selectedFramework,
    isLoading,
    selectedVersion,
    chatId,
    artifactFiles,
    isWebcontainerReady,
    setLoadingState,
    loadingState,
    isLengthError,
  } = useComponentContext();

  // References to hold the active processes and terminal
  const shellProcessRef = useRef<WebContainerProcess | null>(null);
  const devProcessRef = useRef<WebContainerProcess | null>(null);

  // Keep track of the old artifact files so we can detect if package.json changed
  const oldArtifactFilesRef = useRef<typeof artifactFiles>([]);

  useEffect(() => {
    if (shellProcessRef.current) {
      shellProcessRef.current.kill();
      shellProcessRef.current = null;
    }
    if (devProcessRef.current) {
      devProcessRef.current.kill();
      devProcessRef.current = null;
    }
    setBuildError(null);
    setPreviewId(undefined);
    setLoadingState(null);
    oldArtifactFilesRef.current = [];
  }, [chatId]);

  useEffect(() => {
    if (shellProcessRef.current) {
      shellProcessRef.current.kill();
      shellProcessRef.current = null;
    }
    if (devProcessRef.current) {
      devProcessRef.current.kill();
      devProcessRef.current = null;
    }
    setBuildError(null);
    setPreviewId(undefined);
    setLoadingState(null);
    oldArtifactFilesRef.current = [];
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

        // Avoid duplicating similar error messages
        if (prevError.content.includes(possibleError.content)) {
          return prevError;
        }

        // Limit the total content length to prevent overwhelming the UI
        const combinedContent =
          prevError.content + "\n" + possibleError.content;
        const maxLength = 2000;
        const trimmedContent =
          combinedContent.length > maxLength
            ? combinedContent.substring(combinedContent.length - maxLength)
            : combinedContent;

        return {
          ...prevError,
          description: prevError.description,
          content: trimmedContent,
        };
      });
      setLoadingState("error");
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
        setPreviewId(undefined);
        setBuildError(null);
        return;
      }

      if (isLengthError) {
        setLoadingState("token-limit");
        setBuildError(null);
        setPreviewId(undefined);
        oldArtifactFilesRef.current = [];
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

      // Reset error state when files change to avoid showing old component errors
      setBuildError(null);
      setPreviewId(undefined);
      setLoadingState("initializing");

      if (isWebcontainerReady) {
        setLoadingState(null);
        oldArtifactFilesRef.current = [];
        return;
      }

      // Kill old processes before starting new ones
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
          setBuildError({
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
        }
      });

      // Save current files as "old" so we can detect package.json changes next time
      oldArtifactFilesRef.current = artifactFiles;
    };

    setupProject();
  }, [
    artifactFiles,
    isLoading,
    selectedFramework,
    selectedVersion,
    chatId,
    isWebcontainerReady,
    isLengthError,
  ]);

  return (
    <WebcontainerContext.Provider
      value={{
        loadingState,
        setLoadingState,
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
function formatBuildError(data: string): BuildError | null {
  const cleanedData = stripAnsi(data);

  // Skip certain non-critical messages that might be mistaken for errors
  const ignorePatterns = [
    "compiled successfully",
    "compiled with warnings",
    "ready in",
    "waiting for changes",
    "starting development server",
    "listening on",
  ];

  for (const pattern of ignorePatterns) {
    if (cleanedData.toLowerCase().includes(pattern.toLowerCase())) {
      return null;
    }
  }

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
    "Missing script",
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

  // Improve error description based on content
  let description = "An error occurred during build.";

  // Extract specific error details if available
  const errorLines = cleanedData
    .split("\n")
    .filter((line) =>
      errorPatterns.some((pattern) =>
        line.toLowerCase().includes(pattern.toLowerCase()),
      ),
    );

  if (errorLines.length > 0) {
    description = errorLines[0].trim();
  }

  // Limit the display of errors to 20 lines maximum
  const truncatedContent = cleanedData.split("\n").slice(0, 20).join("\n");

  return {
    title: "Build Error",
    description,
    content: truncatedContent,
  };
}
