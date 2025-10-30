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

import { getIntegrationsForWebcontainer } from "@/app/(default)/components/[slug]/actions";
import { webcontainer as webcontainerPromise } from "@/lib/webcontainer";
import { extractFilesFromArtifact } from "@/utils/completion-parser";
import { Framework } from "@/utils/config";
import {
  getUserFriendlyNpmError,
  getUserFriendlyBuildError,
} from "@/utils/npm-error-handler";
import { createClient } from "@/utils/supabase/client";
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

  const shellProcessRef = useRef<WebContainerProcess | null>(null);
  const devProcessRef = useRef<WebContainerProcess | null>(null);
  const shellStreamAbortControllerRef = useRef<AbortController | null>(null);
  const installStreamAbortControllerRef = useRef<AbortController | null>(null);
  const devStreamAbortControllerRef = useRef<AbortController | null>(null);

  const lastBuiltVersionRef = useRef<number | undefined>(undefined);
  const lastBuiltChatIdRef = useRef<string | undefined>(undefined);
  const setupIdRef = useRef<number>(0);

  const cleanupWebcontainer = useCallback(async () => {
    setupIdRef.current += 1;

    if (shellStreamAbortControllerRef.current) {
      shellStreamAbortControllerRef.current.abort();
      shellStreamAbortControllerRef.current = null;
    }
    if (installStreamAbortControllerRef.current) {
      installStreamAbortControllerRef.current.abort();
      installStreamAbortControllerRef.current = null;
    }
    if (devStreamAbortControllerRef.current) {
      devStreamAbortControllerRef.current.abort();
      devStreamAbortControllerRef.current = null;
    }
    if (shellProcessRef.current) {
      shellProcessRef.current.kill();
      shellProcessRef.current = null;
    }
    if (devProcessRef.current) {
      devProcessRef.current.kill();
      devProcessRef.current = null;
    }
  }, []);

  useEffect(() => {
    cleanupWebcontainer();
    setBuildError(null);
    setPreviewId(undefined);
    setLoadingState(null);
    lastBuiltVersionRef.current = undefined;
    lastBuiltChatIdRef.current = undefined;
  }, [chatId, setLoadingState, cleanupWebcontainer]);

  useEffect(() => {
    return () => {
      cleanupWebcontainer();
    };
  }, [cleanupWebcontainer]);

  useEffect(() => {
    setBuildError(null);
    setLoadingState(null);
  }, [selectedFramework, setLoadingState]);

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

  useEffect(() => {
    const setupProject = async () => {
      if (
        selectedVersion === undefined ||
        selectedFramework === Framework.HTML ||
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

      await cleanupWebcontainer();
      const currentSetupId = setupIdRef.current;

      const webcontainer = await webcontainerPromise;
      if (!webcontainer || currentSetupId !== setupIdRef.current) return;

      shellProcessRef.current = await webcontainer.spawn("jsh");
      if (currentSetupId !== setupIdRef.current) {
        shellProcessRef.current?.kill();
        return;
      }

      shellStreamAbortControllerRef.current = new AbortController();
      shellProcessRef.current.output
        .pipeTo(
          new WritableStream({
            write(data) {
              if (currentSetupId === setupIdRef.current) {
                const possibleError = formatBuildError(data);
                if (possibleError) {
                  setBuildError(possibleError);
                  setLoadingState("error");
                }
              }
            },
          }),
          { signal: shellStreamAbortControllerRef.current.signal },
        )
        .catch(() => {});

      try {
        const files = await webcontainer.fs.readdir("/");
        if (currentSetupId !== setupIdRef.current) return;

        for (const file of files) {
          if (file !== "tmp" && file !== ".webcontainer") {
            await webcontainer.fs.rm(file, { recursive: true, force: true });
          }
        }
      } catch (error) {
        console.log("Cleanup error (non-critical):", error);
      }

      if (currentSetupId !== setupIdRef.current) return;

      const supabase = createClient();
      const { data: message } = await supabase
        .from("messages")
        .select("artifact_code")
        .eq("chat_id", chatId)
        .eq("role", "assistant")
        .eq("version", selectedVersion)
        .single();

      if (!message?.artifact_code) {
        console.error("No artifact_code found for this version");
        return;
      }

      const filesFromDatabase = extractFilesFromArtifact(message.artifact_code);

      if (filesFromDatabase.length === 0) {
        console.error("No files extracted from artifact_code");
        return;
      }

      const modifiedFiles = [...filesFromDatabase];

      const envVars = await getIntegrationsForWebcontainer(chatId);
      if (currentSetupId !== setupIdRef.current) return;

      if (Object.keys(envVars).length > 0) {
        const envContent = Object.entries(envVars)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n");

        modifiedFiles.push({
          name: ".env.local",
          content: envContent,
          isActive: false,
          isDelete: false,
        });

        console.log(
          "[WebContainer] Injected environment variables for integrations",
        );
      }

      const fsTree = buildFileSystemTree(modifiedFiles);
      await webcontainer.mount(fsTree);
      if (currentSetupId !== setupIdRef.current) return;

      setLoadingState("processing");
      let installOutput = "";

      installStreamAbortControllerRef.current = new AbortController();
      const installProcess = await webcontainer.spawn("npm", ["install"]);
      if (currentSetupId !== setupIdRef.current) {
        installProcess.kill();
        return;
      }

      installProcess.output
        .pipeTo(
          new WritableStream({
            write(data) {
              if (currentSetupId === setupIdRef.current) {
                const text = stripAnsi(data);
                installOutput += text;
              }
            },
          }),
          { signal: installStreamAbortControllerRef.current.signal },
        )
        .catch(() => {});

      const exitCode = await installProcess.exit;
      if (currentSetupId !== setupIdRef.current) return;

      if (exitCode !== 0) {
        if (currentSetupId !== setupIdRef.current) return;
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

      if (currentSetupId !== setupIdRef.current) return;
      setLoadingState("starting");

      devStreamAbortControllerRef.current = new AbortController();
      devProcessRef.current = await webcontainer.spawn("npm", ["run", "dev"]);
      if (currentSetupId !== setupIdRef.current) {
        devProcessRef.current?.kill();
        return;
      }

      let devOutput = "";
      devProcessRef.current.output
        .pipeTo(
          new WritableStream({
            write(data) {
              if (currentSetupId === setupIdRef.current) {
                const text = stripAnsi(data);
                devOutput += text;

                const possibleError = formatBuildError(devOutput);
                if (possibleError) {
                  setBuildError(possibleError);
                  setLoadingState("error");
                }
              }
            },
          }),
          { signal: devStreamAbortControllerRef.current.signal },
        )
        .catch(() => {});

      webcontainer.on("preview-message", (message) => {
        if (currentSetupId !== setupIdRef.current) return;
        if (
          message.type === "PREVIEW_UNCAUGHT_EXCEPTION" ||
          message.type === "PREVIEW_UNHANDLED_REJECTION"
        ) {
          // Optionally handle preview errors
        }
      });

      webcontainer.on("server-ready", async (port, url) => {
        if (currentSetupId !== setupIdRef.current) return;
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
    forceBuild,
    cleanupWebcontainer,
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
    "Found \\d+ error",
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

  let errorContent = cleanedData;
  const lines = cleanedData.split("\n");

  if (lines.length > 100) {
    const summaryIndex = lines.findIndex((line) =>
      line.match(/Found \d+ error/i),
    );

    if (summaryIndex !== -1) {
      const start = Math.max(0, summaryIndex - 80);
      errorContent = lines.slice(start).join("\n");
    } else {
      const firstErrorIndex = lines.findIndex(
        (line) =>
          line.includes("error TS") ||
          line.includes("Error:") ||
          line.match(/:\d+:\d+\s*-\s*error/),
      );

      if (firstErrorIndex !== -1) {
        const start = Math.max(0, firstErrorIndex - 5);
        errorContent = lines.slice(start).join("\n");
      } else {
        errorContent = lines.slice(-100).join("\n");
      }
    }
  }

  return {
    title: friendlyError.title,
    description: friendlyError.message,
    content: errorContent,
  };
}
