"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";

import { createClient } from "@/utils/supabase/client";

import {
  useComponentContext,
  WebcontainerLoadingState,
} from "./component-context";

type BuildError = {
  title: string;
  description: string;
  errors?: string[];
  exitCode?: number;
};

interface BuilderContextType {
  loadingState: WebcontainerLoadingState;
  setLoadingState: (state: WebcontainerLoadingState) => void;
  buildError: BuildError | null;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export const BuilderProvider = ({ children }: { children: ReactNode }) => {
  const [buildError, setBuildError] = useState<BuildError | null>(null);
  const [loadingState, setLoadingState] =
    useState<WebcontainerLoadingState>(null);
  const pendingBuildsRef = useRef<Set<number>>(new Set());

  const { selectedVersion, chatId, isLoading, setWebcontainerReady } =
    useComponentContext();

  useEffect(() => {
    if (selectedVersion === undefined || isLoading) {
      setBuildError(null);
      setLoadingState(null);
      return;
    }

    const supabase = createClient();

    const fetchBuildStatus = async () => {
      const { data: message } = await supabase
        .from("messages")
        .select("build_error, is_built")
        .eq("chat_id", chatId)
        .eq("role", "assistant")
        .eq("version", selectedVersion)
        .single();

      if (message?.build_error) {
        setBuildError(message.build_error as BuildError);
        setLoadingState("error");
        setWebcontainerReady(false);
      } else if (message && !message.is_built) {
        setLoadingState("processing");
        setWebcontainerReady(false);
      } else if (message?.is_built) {
        setBuildError(null);
        setLoadingState(null);
        setWebcontainerReady(true);
      }
    };

    fetchBuildStatus();

    const channel = supabase
      .channel(`selected-version-${chatId}-${selectedVersion}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessage = payload.new as {
            role: string;
            is_built: boolean;
            build_error: unknown;
            version: number;
          };

          if (newMessage.version === selectedVersion) {
            await fetchBuildStatus();
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [chatId, selectedVersion, isLoading, setWebcontainerReady]);

  useEffect(() => {
    if (!chatId) {
      return;
    }

    const supabase = createClient();

    const checkAndRebuildVersion = async (version: number) => {
      if (pendingBuildsRef.current.has(version)) {
        return;
      }

      const { data: message } = await supabase
        .from("messages")
        .select("artifact_code")
        .eq("chat_id", chatId)
        .eq("role", "assistant")
        .eq("version", version)
        .single();

      if (
        !message?.artifact_code ||
        message.artifact_code.trim().length === 0 ||
        !message.artifact_code.includes("<coderocketFile")
      ) {
        console.log(
          `Skipping build for version ${version}: invalid or empty artifact code`,
        );
        return;
      }

      pendingBuildsRef.current.add(version);

      try {
        const response = await fetch("/api/components/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            version,
          }),
        });

        if (!response.ok) {
          console.error(
            `Failed to rebuild version ${version}:`,
            await response.text(),
          );
        }
      } catch (error) {
        console.error(`Error rebuilding version ${version}:`, error);
      } finally {
        pendingBuildsRef.current.delete(version);
      }
    };

    const checkExistingUnbuiltVersions = async () => {
      const { data: messages } = await supabase
        .from("messages")
        .select("version, is_built, build_error")
        .eq("chat_id", chatId)
        .eq("role", "assistant")
        .eq("is_built", false)
        .is("build_error", null);

      if (messages && messages.length > 0) {
        for (const message of messages) {
          await checkAndRebuildVersion(message.version);
        }
      }
    };

    checkExistingUnbuiltVersions();

    const channel = supabase
      .channel(`build-monitor-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessage = payload.new as {
            role: string;
            is_built: boolean;
            build_error: unknown;
            version: number;
          };
          if (
            newMessage.role === "assistant" &&
            newMessage.is_built === false &&
            !newMessage.build_error
          ) {
            await checkAndRebuildVersion(newMessage.version);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessage = payload.new as {
            role: string;
            is_built: boolean;
            build_error: unknown;
            version: number;
          };
          const oldMessage = payload.old as { is_built: boolean };
          if (
            newMessage.role === "assistant" &&
            newMessage.is_built === false &&
            !newMessage.build_error &&
            oldMessage.is_built !== false
          ) {
            await checkAndRebuildVersion(newMessage.version);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [chatId]);

  return (
    <BuilderContext.Provider
      value={{
        loadingState,
        setLoadingState,
        buildError,
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
};

export const useBuilder = (): BuilderContextType => {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error("useBuilder must be used within a BuilderProvider");
  }
  return context;
};
