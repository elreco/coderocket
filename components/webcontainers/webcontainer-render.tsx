"use client";

import { reloadPreview } from "@webcontainer/api";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const PREVIEW_CHANNEL = "preview-updates";

interface WebContainerPreviewProps {
  previewId: string;
  className?: string;
}

export function WebContainerRender({
  className,
  previewId,
}: WebContainerPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel>();
  const [previewUrl, setPreviewUrl] = useState("");

  // Handle preview refresh
  const handleRefresh = useCallback(() => {
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = "";
      requestAnimationFrame(() => {
        if (iframeRef.current) {
          iframeRef.current.src = previewUrl;
        }
      });
    }
  }, [previewUrl]);

  // Notify other tabs that this preview is ready
  const notifyPreviewReady = useCallback(() => {
    if (broadcastChannelRef.current && previewUrl) {
      broadcastChannelRef.current.postMessage({
        type: "preview-ready",
        previewId,
        url: previewUrl,
        timestamp: Date.now(),
      });
    }
  }, [previewId, previewUrl]);

  // Gestionnaire d'erreurs pour l'iframe
  const handleIframeError = useCallback((event: MessageEvent) => {
    if (event.data.type === "error") {
      console.error("Erreur WebContainer:", event.data.error);
    }
  }, []);

  useEffect(() => {
    if (!previewId) {
      return;
    }

    // Initialize broadcast channel
    broadcastChannelRef.current = new BroadcastChannel(PREVIEW_CHANNEL);

    // Écouter les messages d'erreur de l'iframe
    window.addEventListener("message", handleIframeError);

    // Listen for preview updates
    broadcastChannelRef.current.onmessage = (event) => {
      if (event.data.previewId === previewId) {
        if (
          event.data.type === "refresh-preview" ||
          event.data.type === "file-change"
        ) {
          handleRefresh();
        }
      }
    };

    // Construct the WebContainer preview URL
    const url = `https://${previewId}.local-credentialless.webcontainer-api.io`;
    setPreviewUrl(url);

    // Set the iframe src
    if (iframeRef.current) {
      iframeRef.current.src = url;
      reloadPreview(iframeRef.current);
    }

    // Notify other tabs that this preview is ready
    notifyPreviewReady();

    // Cleanup
    return () => {
      broadcastChannelRef.current?.close();
      window.removeEventListener("message", handleIframeError);
    };
  }, [previewId, handleRefresh, notifyPreviewReady, handleIframeError]);

  return (
    <div className={cn("relative size-full", className)}>
      <iframe
        ref={iframeRef}
        title="WebContainer Preview"
        className="relative z-40 size-full border-none bg-white"
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
        allow="cross-origin-isolated"
        onLoad={() => {
          notifyPreviewReady();
        }}
      />
    </div>
  );
}
