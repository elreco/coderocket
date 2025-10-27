"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const PREVIEW_CHANNEL = "preview-updates";

interface WebContainerPreviewProps {
  previewId: string;
  className?: string;
}

export function WebcontainerRender({
  className,
  previewId,
}: WebContainerPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel>();
  const [previewUrl, setPreviewUrl] = useState("");
  const previewUrlRef = useRef("");

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current && previewUrlRef.current) {
      iframeRef.current.src = "";
      requestAnimationFrame(() => {
        if (iframeRef.current && previewUrlRef.current) {
          iframeRef.current.src = previewUrlRef.current;
        }
      });
    }
  }, []);

  const notifyPreviewReady = useCallback(() => {
    if (broadcastChannelRef.current && previewUrlRef.current) {
      broadcastChannelRef.current.postMessage({
        type: "preview-ready",
        previewId,
        url: previewUrlRef.current,
        timestamp: Date.now(),
      });
    }
  }, [previewId]);

  useEffect(() => {
    if (!previewId) {
      throw new Error("Preview ID is required");
    }

    broadcastChannelRef.current = new BroadcastChannel(PREVIEW_CHANNEL);

    const messageHandler = (event: MessageEvent) => {
      if (event.data.previewId === previewId) {
        if (
          event.data.type === "refresh-preview" ||
          event.data.type === "file-change"
        ) {
          handleRefresh();
        }
      }
    };

    broadcastChannelRef.current.addEventListener("message", messageHandler);

    const url = `https://${previewId}.local-credentialless.webcontainer-api.io`;
    setPreviewUrl(url);

    if (iframeRef.current) {
      iframeRef.current.src = url;
    }

    notifyPreviewReady();

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener(
          "message",
          messageHandler,
        );
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = undefined;
      }
    };
  }, [previewId, handleRefresh, notifyPreviewReady]);

  return (
    <div className={cn("relative size-full", className)}>
      <iframe
        ref={iframeRef}
        title="WebContainer Preview"
        className="relative z-50 size-full border-none bg-white"
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
        allow="credentialless"
        loading="eager"
        onLoad={notifyPreviewReady}
      />
    </div>
  );
}
