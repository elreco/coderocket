"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { ChatFile } from "@/utils/completion-parser";

import { useComponentContext } from "./component-context";

type BuildError = {
  title: string;
  description: string;
  content: string;
};

interface WebcontainerContextType {
  files: ChatFile[];
  setFiles: (files: ChatFile[]) => void;
  error: string | null;
  loadingState: WebcontainerLoadingState;
  setLoadingState: (state: WebcontainerLoadingState) => void;
  buildError: BuildError | null;
  progressMessages: string[];
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
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<BuildError | null>(null);
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const {
    setWebcontainerReady,
    selectedFramework,
    selectedVersion,
    chatId,
    isLoading,
  } = useComponentContext();

  useEffect(() => {
    setWebcontainerReady(false);
    setError(null);
    setProgressMessages([]); // Reset messages on component mount
  }, []);

  useEffect(() => {
    const deployToWebcontainer = async () => {
      setError(null);
      setLoadingState("initializing");
      if (
        selectedFramework === "html" ||
        isLoading ||
        files.length === 0 ||
        selectedVersion === undefined
      ) {
        return;
      }

      try {
        setLoadingState("initializing");
        setProgressMessages([]); // Reset progress messages

        // Step 1: Make a POST request to the deployment API
        const response = await fetch("/api/webcontainers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatId,
            version: selectedVersion,
            files,
          }),
        });

        console.log("response", response.body);

        if (!response.ok) {
          throw new Error("Failed to start deployment");
        }

        // Step 2: Listen for Server-Sent Events (SSE) from the API
        const eventSource = new EventSource("/api/webcontainers");

        eventSource.onmessage = (event) => {
          // Append new progress messages
          setProgressMessages((prev) => [...prev, event.data]);
          eventSource.onmessage = (event) => {
            if (!event.data) return;

            try {
              const payload = JSON.parse(event.data);
              // Vérifie les différents types d'événements
              switch (payload.event) {
                case "error":
                  // => C'est un message d'erreur
                  setBuildError({
                    title: "Deployment error",
                    description: payload.details,
                    content: payload.message,
                  });
                  setLoadingState("error");

                  // Fermer explicitement la connexion SSE pour éviter le déclenchement par défaut de onerror
                  eventSource.close();
                  break;

                case "already-deployed":
                  setWebcontainerReady(true);
                  setLoadingState(null);
                  setError(null);
                  setBuildError(null);
                  break;

                case "end":
                  // => Déploiement terminé avec succès
                  setProgressMessages(() => [payload.details]);
                  setWebcontainerReady(true);
                  setLoadingState(null);
                  eventSource.close();
                  break;

                default:
                  setProgressMessages(() => [payload.details]);
                  break;
              }
            } catch {
              // Si la donnée reçue n'est pas du JSON, on la logge simplement
              setProgressMessages((prev) => [...prev, event.data]);
            }
          };

          eventSource.onerror = () => {
            // Parfois appelé lorsque le flux se ferme côté serveur, même sans « vraie » erreur
            // Mais si tu as géré le flux avec `event: "error"` et `event: "end"`, tu peux décider d'y mettre un fallback
            setWebcontainerReady(true);
            setLoadingState(null);
            // Mécanique de fallback, si jamais rien n'a été envoyé côté serveur
            // ...
            eventSource.close();
          };
        };

        eventSource.onerror = (error) => {
          console.error("Error in eventSource:", error);

          if (eventSource.readyState === EventSource.CLOSED) {
            console.log("Connection closed by server.");
            eventSource.close();
            return;
          }

          setError("An error occurred while deploying.");
          setLoadingState("error");
          eventSource.close();
        };

        eventSource.addEventListener("close", () => {
          setWebcontainerReady(true);
          setLoadingState(null); // Deployment complete
          eventSource.close();
        });
      } catch (e: unknown) {
        setBuildError({
          title: "Deployment error",
          description: "An error occurred during deployment.",
          content: (e as Error).message,
        });
        setLoadingState("error");
      }
    };

    deployToWebcontainer();
  }, [files, isLoading]);

  return (
    <WebcontainerContext.Provider
      value={{
        files,
        setFiles,
        error,
        loadingState,
        setLoadingState,
        buildError,
        progressMessages,
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
