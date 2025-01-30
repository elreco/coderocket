"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

import { useComponentContext } from "./component-context";

type BuildError = {
  title: string;
  description: string;
  content: string;
};

interface WebcontainerContextType {
  error: string | null;
  loadingState: WebcontainerLoadingState;
  setLoadingState: (state: WebcontainerLoadingState) => void;
  buildError: BuildError | null;
  progressMessages: string[];
  cancelDeployment: () => void;
}

const WebcontainerContext = createContext<WebcontainerContextType | undefined>(
  undefined,
);

export type WebcontainerLoadingState =
  | "initializing"
  | "deploying"
  | "error"
  | null;

export const WebcontainerProvider = ({ children }: { children: ReactNode }) => {
  const [loadingState, setLoadingState] =
    useState<WebcontainerLoadingState>(null);
  const [error, setError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<BuildError | null>(null);
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [currentDeployment, setCurrentDeployment] = useState<{
    chatId: string;
    version: number | undefined;
  } | null>(null);
  const {
    setWebcontainerReady,
    selectedFramework,
    selectedVersion,
    chatId,
    isLoading,
  } = useComponentContext();

  const cancelDeployment = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setLoadingState(null);
      setCurrentDeployment(null);
    }
  }, [eventSource]);

  useEffect(() => {
    setWebcontainerReady(false);
    setError(null);
    setProgressMessages([]);
    return () => {
      cancelDeployment();
    };
  }, []);

  useEffect(() => {
    const deployToWebcontainer = async () => {
      console.log("deployToWebcontainer");
      if (
        selectedFramework === "html" ||
        isLoading ||
        selectedVersion === undefined
      ) {
        return;
      }

      if (
        currentDeployment?.chatId === chatId &&
        currentDeployment?.version === selectedVersion
      ) {
        return;
      }

      if (eventSource) {
        cancelDeployment();
      }

      try {
        setError(null);
        setLoadingState("initializing");
        setProgressMessages([]);
        setBuildError(null);

        const newEventSource = new EventSource(
          `/api/webcontainers?chatId=${chatId}&version=${selectedVersion}`,
        );
        setEventSource(newEventSource);
        setCurrentDeployment({ chatId, version: selectedVersion });

        newEventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log(data.event);
          switch (data.event) {
            case "init":
            case "processing":
              setLoadingState("initializing");
              setProgressMessages((prev) => [...prev, data.message]);
              break;

            case "deploying":
            case "building":
            case "uploading":
              setLoadingState("deploying");
              setProgressMessages((prev) => [...prev, data.message]);
              break;

            case "error":
              setBuildError({
                title: "Deployment error",
                description: "An error occurred during deployment.",
                content: data.message,
              });
              setLoadingState("error");
              newEventSource.close();
              setEventSource(null);
              setCurrentDeployment(null);
              break;

            case "cancelled":
              setProgressMessages((prev) => [...prev, "Deployment cancelled"]);
              setLoadingState(null);
              newEventSource.close();
              setEventSource(null);
              setCurrentDeployment(null);
              break;

            case "success":
              setProgressMessages((prev) => [
                ...prev,
                "Deployment completed successfully!",
              ]);
              setWebcontainerReady(true);
              setLoadingState(null);
              newEventSource.close();
              setEventSource(null);
              break;

            case "already-deployed":
              setWebcontainerReady(true);
              setLoadingState(null);
              newEventSource.close();
              setEventSource(null);
              break;
          }
        };

        newEventSource.onerror = () => {
          setWebcontainerReady(true);
          setLoadingState(null);
          newEventSource.close();
          setEventSource(null);
        };
      } catch (e: unknown) {
        setBuildError({
          title: "Deployment error",
          description: "An error occurred during deployment.",
          content: (e as Error).message,
        });
        setLoadingState("error");
        setCurrentDeployment(null);
      }
    };

    deployToWebcontainer();
  }, [isLoading, selectedFramework, selectedVersion, chatId]);

  return (
    <WebcontainerContext.Provider
      value={{
        error,
        loadingState,
        setLoadingState,
        buildError,
        progressMessages,
        cancelDeployment,
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
