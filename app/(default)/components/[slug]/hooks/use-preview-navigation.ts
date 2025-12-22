import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { BreakpointType } from "@/context/component-context";
import { Framework } from "@/utils/config";

interface UsePreviewNavigationOptions {
  chatId: string;
  framework: Framework | null;
  selectedVersion: number | undefined;
  isWebcontainerReady: boolean;
  isLoading: boolean;
  isLengthError: boolean;
  artifactFilesCount: number;
}

export function usePreviewNavigation({
  chatId,
  framework,
  selectedVersion,
  isWebcontainerReady,
  isLoading,
  isLengthError,
  artifactFilesCount,
}: UsePreviewNavigationOptions) {
  const [previewPath, setPreviewPath] = useState("/");
  const [addressBarValue, setAddressBarValue] = useState("/");
  const [navigationHistory, setNavigationHistory] = useState<string[]>(["/"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [addressFocused, setAddressFocused] = useState(false);
  const [breakpoint, setBreakpoint] = useState<BreakpointType>("desktop");

  const historyIndexRef = useRef(0);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const ignoreNextRootRouteRef = useRef<boolean>(false);
  const previousChatIdRef = useRef<string | null>(null);
  const previousFrameworkRef = useRef<Framework | null>(null);

  const isHtmlFrameworkSelected = framework === Framework.HTML;
  const previewPathSuffix = previewPath === "/" ? "" : previewPath;
  const sharePathSuffix = addressBarValue === "/" ? "" : addressBarValue;
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < navigationHistory.length - 1;

  const canUseSpaNavigation =
    !isHtmlFrameworkSelected &&
    isWebcontainerReady &&
    selectedVersion !== undefined &&
    !isLoading;
  const canUseHtmlNavigation =
    isHtmlFrameworkSelected && artifactFilesCount > 0 && !isLengthError;
  const isNavigationEnabled = canUseSpaNavigation || canUseHtmlNavigation;
  const navigationPlaceholder = isHtmlFrameworkSelected ? "/index.html" : "/";

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    const isChatIdChange =
      previousChatIdRef.current !== null &&
      previousChatIdRef.current !== chatId;
    const isFrameworkChange =
      previousFrameworkRef.current !== null &&
      previousFrameworkRef.current !== framework;
    const isFirstLoad = previousChatIdRef.current === null;

    if (isChatIdChange || isFrameworkChange || isFirstLoad) {
      setPreviewPath("/");
      setAddressBarValue("/");
      setNavigationHistory(["/"]);
      setHistoryIndex(0);
      historyIndexRef.current = 0;
    }

    previousChatIdRef.current = chatId;
    previousFrameworkRef.current = framework || null;
  }, [chatId, framework]);

  useEffect(() => {
    if (addressBarValue !== "/") {
      ignoreNextRootRouteRef.current = true;
      setPreviewPath(addressBarValue);
    }
  }, [selectedVersion, addressBarValue]);

  const normalizePreviewPath = useCallback((value: string) => {
    if (!value) {
      return "/";
    }
    let nextPath = value.trim();
    if (!nextPath.startsWith("/")) {
      nextPath = `/${nextPath}`;
    }
    if (nextPath.includes("?")) {
      nextPath = nextPath.split("?")[0];
    }
    const hashIndex = nextPath.indexOf("#");
    const hash = hashIndex !== -1 ? nextPath.substring(hashIndex) : "";
    if (hashIndex !== -1) {
      nextPath = nextPath.substring(0, hashIndex);
    }
    nextPath = nextPath.replace(/\/+/g, "/");
    if (nextPath.length > 1 && nextPath.endsWith("/")) {
      nextPath = nextPath.slice(0, -1);
    }
    return (nextPath || "/") + hash;
  }, []);

  const pushPathToHistory = useCallback(
    (normalizedPath: string, shouldPushHistory: boolean) => {
      if (!shouldPushHistory) {
        return;
      }
      setNavigationHistory((prev) => {
        const activeIndex = historyIndexRef.current;
        const trimmedHistory =
          activeIndex < prev.length - 1 ? prev.slice(0, activeIndex + 1) : prev;
        if (trimmedHistory[trimmedHistory.length - 1] === normalizedPath) {
          const currentIndex = trimmedHistory.length - 1;
          setHistoryIndex(currentIndex);
          historyIndexRef.current = currentIndex;
          return trimmedHistory;
        }
        const updatedHistory = [...trimmedHistory, normalizedPath];
        const newIndex = updatedHistory.length - 1;
        setHistoryIndex(newIndex);
        historyIndexRef.current = newIndex;
        return updatedHistory;
      });
    },
    [],
  );

  const navigatePreview = useCallback(
    (targetPath: string, options?: { pushHistory?: boolean }) => {
      const normalizedPath = normalizePreviewPath(targetPath);
      setPreviewPath(normalizedPath);
      setAddressBarValue(normalizedPath);
      pushPathToHistory(normalizedPath, options?.pushHistory !== false);
    },
    [normalizePreviewPath, pushPathToHistory],
  );

  const syncPreviewPath = useCallback(
    (targetPath: string, options?: { pushHistory?: boolean }) => {
      const normalizedPath = normalizePreviewPath(targetPath);
      if (normalizedPath === "/" && ignoreNextRootRouteRef.current) {
        ignoreNextRootRouteRef.current = false;
        return;
      }
      ignoreNextRootRouteRef.current = false;
      setAddressBarValue(normalizedPath);
      pushPathToHistory(normalizedPath, options?.pushHistory !== false);
    },
    [normalizePreviewPath, pushPathToHistory],
  );

  const handleGoBack = useCallback(() => {
    if (!canGoBack) {
      return;
    }
    const newIndex = historyIndex - 1;
    const targetPath = navigationHistory[newIndex] || "/";
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    navigatePreview(targetPath, { pushHistory: false });
  }, [canGoBack, historyIndex, navigationHistory, navigatePreview]);

  const handleGoForward = useCallback(() => {
    if (!canGoForward) {
      return;
    }
    const newIndex = historyIndex + 1;
    const targetPath = navigationHistory[newIndex] || "/";
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    navigatePreview(targetPath, { pushHistory: false });
  }, [canGoForward, historyIndex, navigationHistory, navigatePreview]);

  const handleAddressSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isNavigationEnabled) {
        return;
      }
      navigatePreview(addressBarValue);
      addressInputRef.current?.blur();
    },
    [isNavigationEnabled, navigatePreview, addressBarValue],
  );

  const setIgnoreNextRootRoute = useCallback((value: boolean) => {
    ignoreNextRootRouteRef.current = value;
  }, []);

  return {
    previewPath,
    setPreviewPath,
    addressBarValue,
    setAddressBarValue,
    addressFocused,
    setAddressFocused,
    breakpoint,
    setBreakpoint,
    navigationHistory,
    historyIndex,
    addressInputRef,

    isHtmlFrameworkSelected,
    previewPathSuffix,
    sharePathSuffix,
    canGoBack,
    canGoForward,
    isNavigationEnabled,
    navigationPlaceholder,

    navigatePreview,
    syncPreviewPath,
    handleGoBack,
    handleGoForward,
    handleAddressSubmit,
    setIgnoreNextRootRoute,
  };
}
