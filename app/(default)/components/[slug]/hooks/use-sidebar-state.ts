import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getSubscription } from "@/app/supabase-server";
import { Tables } from "@/types_db";
import {
  ChatFile,
  extractFilesFromCompletion,
  categorizeFiles,
} from "@/utils/completion-parser";

interface UseSidebarStateProps {
  connectedUser: { id: string } | null;
  messages: Tables<"messages">[];
  selectedVersion: number | undefined;
  isLoading: boolean;
  completion: string;
  isScrapingWebsite: boolean;
  setIsScrapingWebsite: (value: boolean) => void;
}

export function useSidebarState({
  connectedUser,
  messages,
  selectedVersion,
  isLoading,
  completion,
  isScrapingWebsite,
  setIsScrapingWebsite,
}: UseSidebarStateProps) {
  const [isLoaderVisible, setLoaderVisible] = useState(true);
  const [subscription, setSubscription] = useState<
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null
  >(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentVersionRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const isLoggedIn = !!connectedUser?.id;

  const hasAssistantMessage = useMemo(
    () => messages.some((m) => m.role === "assistant"),
    [messages],
  );

  const selectedAssistantMessage = useMemo(
    () =>
      messages.find(
        (m) => m.role === "assistant" && m.version === selectedVersion,
      ),
    [messages, selectedVersion],
  );

  const currentMessageFiles = useMemo(() => {
    if (!selectedAssistantMessage?.content) return [];
    return extractFilesFromCompletion(selectedAssistantMessage.content);
  }, [selectedAssistantMessage?.content]);

  const hasUnexecutedMigration = useMemo(() => {
    if (currentMessageFiles.length === 0) return false;
    const categorized = categorizeFiles(currentMessageFiles);
    return categorized.migrations.some((migration: ChatFile) => {
      const migrationsExecuted =
        selectedAssistantMessage?.migrations_executed as Array<{
          name: string;
          executed_at: string;
        }> | null;
      const isExecuted = (migrationsExecuted || []).some(
        (m) => m.name === migration.name,
      );
      return !isExecuted;
    });
  }, [currentMessageFiles, selectedAssistantMessage?.migrations_executed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaderVisible(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoadingSubscription(true);

        if (connectedUser?.id) {
          const sub = await getSubscription(connectedUser.id);
          setSubscription(sub);
        } else {
          setSubscription(null);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, [connectedUser?.id]);

  const hasDeactivatedScraping = useRef(false);
  useEffect(() => {
    if (
      isScrapingWebsite &&
      completion &&
      completion.length > 0 &&
      !hasDeactivatedScraping.current
    ) {
      hasDeactivatedScraping.current = true;
      setIsScrapingWebsite(false);
    }
    if (!isLoading) {
      hasDeactivatedScraping.current = false;
    }
  }, [isLoading, isScrapingWebsite, setIsScrapingWebsite, completion]);

  const startScrapeSimulation = useCallback(() => {
    setIsScrapingWebsite(true);
    return null;
  }, [setIsScrapingWebsite]);

  return {
    isLoaderVisible,
    subscription,
    isLoadingSubscription,
    containerRef,
    currentVersionRef,
    inputRef,
    isLoggedIn,
    hasAssistantMessage,
    selectedAssistantMessage,
    currentMessageFiles,
    hasUnexecutedMigration,
    startScrapeSimulation,
  };
}
