"use client";

import { useEffect, useState, useCallback } from "react";

// Define the SelectorTool type
type SelectorTool = {
  startSelection: () => void;
  getSelectedSelector: () => string | null;
  cancelSelection: () => void;
};

// Extend Window interface to include initIframeElementSelector
declare global {
  interface Window {
    initIframeElementSelector?: (
      iframe: HTMLIFrameElement,
      callback?: (selector: string) => void,
    ) => SelectorTool;
  }
}

interface IframeElementSelectorProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onSelect: (selector: string) => void;
  enabled?: boolean;
}

/**
 * Component that facilitates selecting elements in an iframe
 * Works with iframe-messenger.js to bypass cross-origin restrictions
 */
export function IframeElementSelector({
  iframeRef,
  onSelect,
  enabled = false,
}: IframeElementSelectorProps) {
  const [isListening, setIsListening] = useState(false);
  const [scriptInjected, setScriptInjected] = useState(false);
  const [selectorTool, setSelectorTool] = useState<SelectorTool | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Préchargement du script au montage du composant - une seule fois
  useEffect(() => {
    // Ne charger le script qu'une seule fois par session
    if (
      !window.initIframeElementSelector &&
      !scriptInjected &&
      document.querySelector('script[src="/parent-iframe-handler.js"]') === null
    ) {
      console.log("[Buildr] Loading parent-iframe-handler.js");
      const script = document.createElement("script");
      script.src = "/parent-iframe-handler.js";
      script.onload = () => {
        console.log("[Buildr] parent-iframe-handler.js loaded");
        setScriptInjected(true);
      };
      document.head.appendChild(script);
    } else if (window.initIframeElementSelector && !scriptInjected) {
      // Si le script est déjà chargé globalement
      setScriptInjected(true);
    }
  }, []); // Dépendance vide - s'exécute une seule fois au montage

  // Réinitialisation du sélecteur quand l'iframe change
  useEffect(() => {
    if (!enabled || isInitializing) return;

    // Si enabled devient true, essayer d'initialiser
    if (
      iframeRef.current &&
      scriptInjected &&
      window.initIframeElementSelector
    ) {
      setIsInitializing(true);

      console.log("[Buildr] Initializing selector tool with iframe");
      try {
        // Vérifier que l'iframe est accessible
        if (iframeRef.current.contentWindow) {
          const tool = window.initIframeElementSelector(
            iframeRef.current,
            (selector) => {
              console.log("[Buildr] Element selected:", selector);
              if (onSelect && typeof onSelect === "function") {
                onSelect(selector);
              }
              setIsListening(false);
            },
          );

          setSelectorTool(tool);
          console.log("[Buildr] Selector tool initialized successfully");
        }
      } catch (error) {
        console.error("[Buildr] Error initializing selector tool:", error);
      } finally {
        setIsInitializing(false);
      }
    }
  }, [
    enabled,
    iframeRef.current,
    scriptInjected,
    window.initIframeElementSelector,
    onSelect,
  ]);

  // Gestion des messages pour la compatibilité avec iframe-messenger
  useEffect(() => {
    if (!enabled) return;

    // Event handler for messages from the iframe
    const handleMessage = (event: MessageEvent) => {
      const trustedDomains = [
        "https://dev.webcontainer.coderocket.app",
        "https://webcontainer.coderocket.app",
        "https://dev.coderocket.app",
        "https://coderocket.app",
        "https://www.coderocket.app",
      ];

      // Origin check
      const origin = event.origin;
      if (!trustedDomains.some((domain) => origin.startsWith(domain))) {
        return; // Ignore messages from untrusted origins
      }

      // Handle ready message from iframe
      if (event.data && event.data.type === "iframe-messenger-ready") {
        console.log("iframe-messenger is ready in iframe");
        setIsListening(true);
      }

      // Handle element selection result directly
      if (
        event.data &&
        event.data.type === "element-selector-result" &&
        event.data.selector
      ) {
        console.log(
          "[Buildr] Element selected via message:",
          event.data.selector,
        );
        if (onSelect && typeof onSelect === "function") {
          onSelect(event.data.selector);
        }
        setIsListening(false);
      }
    };

    // Add event listener
    window.addEventListener("message", handleMessage);

    // Clean up
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [enabled, onSelect]);

  // Start element selection process - fonction simplifiée et optimisée
  const startSelection = useCallback(() => {
    if (!iframeRef || !iframeRef.current) {
      console.error("No iframe reference provided");
      return;
    }

    console.log("[Buildr] Starting element selection");
    setIsListening(true);

    // Multiples stratégies pour démarrer la sélection
    try {
      // Stratégie 1: Utiliser l'outil de sélection si disponible
      if (selectorTool) {
        console.log("[Buildr] Using selector tool to start selection");
        selectorTool.startSelection();
        return;
      }

      // Stratégie 2: Initialiser juste à temps
      if (window.initIframeElementSelector && iframeRef.current) {
        console.log("[Buildr] Just-in-time initializing selector tool");
        try {
          const tool = window.initIframeElementSelector(
            iframeRef.current,
            (selector) => {
              if (onSelect && typeof onSelect === "function") {
                onSelect(selector);
              }
              setIsListening(false);
            },
          );
          setSelectorTool(tool);
          tool.startSelection();
          return;
        } catch (e) {
          console.error("[Buildr] Error initializing tool just-in-time:", e);
        }
      }

      // Stratégie 3: Essayer directement postMessage
      console.log("[Buildr] Using direct postMessage fallback");
      if (iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "get-element-selector",
          },
          "*",
        );
      }
    } catch (error) {
      console.error("[Buildr] Error starting element selection:", error);

      // Stratégie 4: Dernier recours - injecter un script dans le parent
      try {
        console.log("[Buildr] Attempting parent injection fallback");
        const script = document.createElement("script");
        script.textContent = `
          try {
            const iframe = document.querySelector("iframe");
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({
                type: "get-element-selector"
              }, "*");
            }
          } catch(e) { console.error("Fallback failed:", e); }
        `;
        document.body.appendChild(script);
        setTimeout(() => {
          document.body.removeChild(script);
        }, 100);
      } catch (e) {
        console.error("[Buildr] All selection strategies failed:", e);
      }
    }
  }, [iframeRef, selectorTool, onSelect]);

  // Cancel active selection
  const cancelSelection = useCallback(() => {
    console.log("[Buildr] Cancelling element selection");

    let success = false;

    // Try multiple cancellation strategies to ensure it works

    // Strategy 1: Use the selector tool if available
    if (selectorTool) {
      try {
        selectorTool.cancelSelection();
        console.log("[Buildr] Cancellation via selector tool completed");
        success = true;
      } catch (error) {
        console.error("[Buildr] Error cancelling via selector tool:", error);
      }
    }

    // Strategy 2: Direct message to iframe - always try this regardless of selectorTool
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        // Send multiple cancel requests to ensure delivery
        for (let i = 0; i < 3; i++) {
          iframeRef.current.contentWindow.postMessage(
            {
              type: "cancel-element-selector",
              timestamp: Date.now() + i, // Add timestamp to ensure message uniqueness
              attempt: i,
            },
            "*",
          );
        }
        console.log("[Buildr] Direct cancellation messages sent to iframe");
        success = true;
      } catch (error) {
        console.error("[Buildr] Error sending direct cancel message:", error);
      }
    }

    // Strategy 3: Try to find any iframe in the document as a fallback
    try {
      const allIframes = document.querySelectorAll("iframe");
      if (allIframes.length > 0) {
        console.log("[Buildr] Attempting fallback cancellation to all iframes");
        allIframes.forEach((iframe) => {
          if (iframe.contentWindow) {
            try {
              iframe.contentWindow.postMessage(
                {
                  type: "cancel-element-selector",
                  source: "fallback",
                },
                "*",
              );
              success = true;
            } catch {
              // Silently continue if one iframe fails
            }
          }
        });
      }
    } catch (error) {
      console.error("[Buildr] Fallback iframe cancellation failed:", error);
    }

    // Strategy 4: Nuclear option - if all else fails, try to force reload the iframe
    if (!success && iframeRef.current) {
      try {
        const currentSrc = iframeRef.current.src;
        if (currentSrc) {
          console.log(
            "[Buildr] Attempting nuclear option - force reloading iframe",
          );
          const srcWithTimestamp = currentSrc.includes("?")
            ? `${currentSrc}&_t=${Date.now()}`
            : `${currentSrc}?_t=${Date.now()}`;

          // Change to empty then back to force reload
          iframeRef.current.src = "about:blank";

          // After a short delay, set back to original with timestamp
          setTimeout(() => {
            if (iframeRef.current) {
              iframeRef.current.src = srcWithTimestamp;
            }
          }, 50);
        }
      } catch (err) {
        console.error("[Buildr] Nuclear option failed:", err);
      }
    }

    // Always update local state
    setIsListening(false);

    return true; // Return success to indicate the cancellation was attempted
  }, [selectorTool, iframeRef]);

  return {
    startSelection,
    cancelSelection,
    isListening,
  };
}
