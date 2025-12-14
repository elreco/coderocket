"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
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

  const supabase = createClient();
  const { selectedVersion, chatId, isLoading, setWebcontainerReady } =
    useComponentContext();

  useEffect(() => {
    if (selectedVersion === undefined) {
      setBuildError(null);
      setLoadingState(null);
    }
  }, [selectedVersion]);

  const fetchBuildStatus = useCallback(async () => {
    if (selectedVersion === undefined) {
      return;
    }

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
  }, [chatId, selectedVersion, setWebcontainerReady, supabase]);

  useEffect(() => {
    if (selectedVersion === undefined || isLoading) {
      return;
    }

    fetchBuildStatus();
  }, [selectedVersion, isLoading, fetchBuildStatus]);

  useEffect(() => {
    if (selectedVersion === undefined || isLoading) {
      return;
    }

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
  }, [chatId, selectedVersion, isLoading, fetchBuildStatus, supabase]);

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
