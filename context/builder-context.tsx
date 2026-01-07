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

export type BuildError = {
  title: string;
  description: string;
  errors?: string[];
  exitCode?: number;
};

export type BuildStatusPayload = {
  isBuilt: boolean;
  isBuilding?: boolean;
  buildError: unknown;
  version: number;
};

interface BuilderContextType {
  loadingState: WebcontainerLoadingState;
  setLoadingState: (state: WebcontainerLoadingState) => void;
  buildError: BuildError | null;
}

interface BuilderProviderProps {
  children: ReactNode;
  buildStatusPayload?: BuildStatusPayload | null;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export const BuilderProvider = ({
  children,
  buildStatusPayload,
}: BuilderProviderProps) => {
  const [buildError, setBuildError] = useState<BuildError | null>(null);
  const [loadingState, setLoadingState] =
    useState<WebcontainerLoadingState>(null);

  const supabase = createClient();
  const { selectedVersion, chatId, setWebcontainerReady } =
    useComponentContext();

  useEffect(() => {
    if (selectedVersion === undefined) {
      setBuildError(null);
      setLoadingState(null);
    }
  }, [selectedVersion]);

  // Process build status from realtime updates (via props from parent)
  const processBuildStatus = useCallback(
    (isBuilt: boolean, isBuilding: boolean, buildErrorData: unknown) => {
      const errorData = buildErrorData as {
        title?: string;
      } | null;

      // If there's a build error with a title, show error
      if (buildErrorData && errorData?.title) {
        setBuildError(buildErrorData as BuildError);
        setLoadingState("error");
        setWebcontainerReady(false);
      } else if (isBuilding || !isBuilt) {
        // Build is in progress (either building or not built yet)
        setBuildError(null);
        setLoadingState("processing");
        setWebcontainerReady(false);
      } else if (isBuilt) {
        // Build is complete
        setBuildError(null);
        setLoadingState("starting");
        setWebcontainerReady(true);
      }
    },
    [setWebcontainerReady],
  );

  // React to build status changes from realtime sync
  // Allow processing even during isLoading to catch build state changes
  useEffect(() => {
    if (buildStatusPayload && buildStatusPayload.version === selectedVersion) {
      processBuildStatus(
        buildStatusPayload.isBuilt,
        buildStatusPayload.isBuilding || false,
        buildStatusPayload.buildError,
      );
    }
  }, [buildStatusPayload, selectedVersion, processBuildStatus]);

  // Initial fetch on mount or version change
  const fetchBuildStatus = useCallback(async () => {
    if (selectedVersion === undefined) {
      return;
    }

    const { data: message } = await supabase
      .from("messages")
      .select("build_error, is_built, is_building")
      .eq("chat_id", chatId)
      .eq("role", "assistant")
      .eq("version", selectedVersion)
      .maybeSingle();

    if (message) {
      processBuildStatus(
        message.is_built || false,
        message.is_building || false,
        message.build_error,
      );
    }
  }, [chatId, selectedVersion, supabase, processBuildStatus]);

  useEffect(() => {
    if (selectedVersion === undefined) {
      return;
    }

    // Fetch build status even during isLoading to catch build state changes
    fetchBuildStatus();
  }, [selectedVersion, fetchBuildStatus]);

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
