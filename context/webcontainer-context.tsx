"use client";

import { WebContainerProcess } from "@webcontainer/api";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import stripAnsi from "strip-ansi";

import { webcontainer as webcontainerPromise } from "@/lib/webcontainer";
import { Framework } from "@/utils/config";
import {
  getUserFriendlyNpmError,
  getUserFriendlyBuildError,
} from "@/utils/npm-error-handler";
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
    forceBuild,
  } = useComponentContext();

  // References to hold the active processes and terminal
  const shellProcessRef = useRef<WebContainerProcess | null>(null);
  const devProcessRef = useRef<WebContainerProcess | null>(null);

  const lastBuiltVersionRef = useRef<number | undefined>(undefined);
  const lastBuiltChatIdRef = useRef<string | undefined>(undefined);

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
    lastBuiltVersionRef.current = undefined;
    lastBuiltChatIdRef.current = undefined;
  }, [chatId, setLoadingState]);

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
    lastBuiltVersionRef.current = undefined;
    lastBuiltChatIdRef.current = undefined;
  }, [setLoadingState]);

  // Clear errors when framework changes to prevent showing old framework errors
  useEffect(() => {
    setBuildError(null);
    setLoadingState(null);
  }, [selectedFramework, setLoadingState]);

  // Clear errors when selected version changes (new component)
  useEffect(() => {
    setBuildError(null);
    setLoadingState(null);
  }, [selectedVersion, setLoadingState]);

  useEffect(() => {
    if (isWebcontainerReady && loadingState === "starting") {
      setLoadingState(null);
      setBuildError(null);
    }
  }, [isWebcontainerReady, loadingState, setLoadingState]);

  const addToBuildError = useCallback(
    (data: string) => {
      const possibleError = formatBuildError(data);
      if (possibleError) {
        // Only set error if we haven't recently cleared it (avoid race conditions)
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
    },
    [setLoadingState],
  );

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
        setLoadingState(null);
        return;
      }

      if (isLengthError) {
        setLoadingState("token-limit");
        setBuildError(null);
        setPreviewId(undefined);
        lastBuiltVersionRef.current = undefined;
        return;
      }

      const chatIdChanged = lastBuiltChatIdRef.current !== chatId;
      const versionChanged = lastBuiltVersionRef.current !== selectedVersion;
      const needsRebuild = chatIdChanged || versionChanged || forceBuild;

      if (!needsRebuild) {
        return;
      }

      if (isWebcontainerReady && !forceBuild) {
        setLoadingState(null);
        setBuildError(null);
        setPreviewId(undefined);
        lastBuiltVersionRef.current = selectedVersion;
        lastBuiltChatIdRef.current = chatId;
        return;
      }

      setBuildError(null);
      setPreviewId(undefined);
      setLoadingState("initializing");

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

      // 6) Clean up old files before mounting new ones
      try {
        const files = await webcontainer.fs.readdir("/");
        for (const file of files) {
          if (file !== "tmp" && file !== ".webcontainer") {
            await webcontainer.fs.rm(file, { recursive: true, force: true });
          }
        }
      } catch (error) {
        console.log("Cleanup error (non-critical):", error);
      }

      // 7) Mount/update all files
      const fsTree = buildFileSystemTree(artifactFiles);
      await webcontainer.mount(fsTree);

      setLoadingState("processing");
      let installOutput = "";
      const installProcess = await webcontainer.spawn("npm", ["install"]);
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            const text = stripAnsi(data);
            installOutput += text;
            addToBuildError(data);
          },
        }),
      );

      const exitCode = await installProcess.exit;

      if (exitCode !== 0) {
        const cleanedOutput = cleanOutput(installOutput);
        const friendlyError = getUserFriendlyNpmError(cleanedOutput);
        setBuildError({
          title: friendlyError.title,
          description: friendlyError.message,
          content: cleanedOutput,
        });
        setLoadingState("error");
        return;
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
          /* const isPromise = message.type === "PREVIEW_UNHANDLED_REJECTION";
          setBuildError({
            title: isPromise
              ? "Unhandled Promise Rejection"
              : "Uncaught Exception",
            description: message.message,
            content: `Error occurred at ${message.pathname}${message.search}${message.hash}`,
          }); */
        }
      });

      webcontainer.on("server-ready", async (port, url) => {
        const newPreviewId = getPreviewId(url);
        if (newPreviewId) {
          setLoadingState(null);
          setPreviewId(newPreviewId);
          setBuildError(null);
          lastBuiltVersionRef.current = selectedVersion;
          lastBuiltChatIdRef.current = chatId;
        }
      });
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
    setLoadingState,
    addToBuildError,
    forceBuild,
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

function cleanOutput(data: string): string {
  let cleaned = stripAnsi(data);
  cleaned = cleaned
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[|/\-\\]{2,}/g, "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !/^[|/\-\\]+$/.test(trimmed);
    })
    .join("\n")
    .trim();

  return cleaned;
}

function formatBuildError(data: string): BuildError | null {
  const cleanedData = cleanOutput(data);

  const ignorePatterns = [
    "compiled successfully",
    "compiled with warnings",
    "ready in",
    "waiting for changes",
    "starting development server",
    "listening on",
    "webpack compiled",
    "hot reload",
    "hmr update",
    "local:",
    "network:",
    "press r to restart",
    "press o to open",
    "press q to quit",
    "ready - started server",
    "event - compiled",
    "found 0 errors",
    "svelte check found 0",
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

  const friendlyError = getUserFriendlyBuildError(cleanedData);
  const truncatedContent = cleanedData.split("\n").slice(0, 20).join("\n");

  return {
    title: friendlyError.title,
    description: friendlyError.message,
    content: truncatedContent,
  };
}
