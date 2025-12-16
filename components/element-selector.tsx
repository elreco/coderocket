"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useComponentContext } from "@/context/component-context";
import { Framework } from "@/utils/config";

interface ElementSelectorProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

export function ElementSelector({ iframeRef }: ElementSelectorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const {
    isElementSelectionActive,
    setSelectedElement,
    setElementSelectionActive,
    previewPath,
    selectedFramework,
  } = useComponentContext();

  useEffect(() => {
    if (!isElementSelectionActive || !iframeRef.current) {
      return;
    }

    const overlay = overlayRef.current;
    if (!overlay) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!iframeRef.current || !overlay) return;

      const iframeRect = iframeRef.current.getBoundingClientRect();
      const x = e.clientX - iframeRect.left;
      const y = e.clientY - iframeRect.top;

      try {
        const iframeWindow = iframeRef.current.contentWindow;
        if (iframeWindow) {
          iframeWindow.postMessage(
            {
              type: "coderocket-element-hover",
              x,
              y,
            },
            "*",
          );
        }
      } catch {
        // Ignore cross-origin errors
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!iframeRef.current || !overlay) return;

      const iframeRect = iframeRef.current.getBoundingClientRect();
      const x = e.clientX - iframeRect.left;
      const y = e.clientY - iframeRect.top;

      try {
        const iframeWindow = iframeRef.current.contentWindow;
        if (iframeWindow) {
          iframeWindow.postMessage(
            {
              type: "coderocket-element-select",
              x,
              y,
            },
            "*",
          );
        }
      } catch {
        // Ignore cross-origin errors
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!iframeRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      try {
        const iframeWindow = iframeRef.current.contentWindow;
        if (iframeWindow) {
          const iframeRect = iframeRef.current.getBoundingClientRect();
          const x = e.clientX - iframeRect.left;
          const y = e.clientY - iframeRect.top;

          iframeWindow.postMessage(
            {
              type: "coderocket-scroll",
              deltaX: e.deltaX,
              deltaY: e.deltaY,
              x,
              y,
            },
            "*",
          );
        }
      } catch {
        // Ignore cross-origin errors
      }
    };

    overlay.addEventListener("mousemove", handleMouseMove);
    overlay.addEventListener("click", handleClick);
    overlay.addEventListener("wheel", handleWheel, { passive: false });

    const sendSelectionMode = () => {
      try {
        const iframeWindow = iframeRef.current?.contentWindow;
        if (iframeWindow) {
          iframeWindow.postMessage(
            {
              type: "coderocket-selection-mode",
              enabled: true,
              previewPath: previewPath || "/",
              isHtmlFramework: selectedFramework === Framework.HTML,
            },
            "*",
          );
        }
      } catch {
        // Ignore cross-origin errors
      }
    };

    sendSelectionMode();

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener("load", sendSelectionMode);
    }

    return () => {
      overlay.removeEventListener("mousemove", handleMouseMove);
      overlay.removeEventListener("click", handleClick);
      overlay.removeEventListener("wheel", handleWheel);

      if (iframe) {
        iframe.removeEventListener("load", sendSelectionMode);
      }

      try {
        const iframeWindow = iframe?.contentWindow;
        if (iframeWindow) {
          iframeWindow.postMessage(
            {
              type: "coderocket-selection-mode",
              enabled: false,
            },
            "*",
          );
        }
      } catch {
        // Ignore cross-origin errors
      }
    };
  }, [isElementSelectionActive, iframeRef, previewPath, selectedFramework]);

  useEffect(() => {
    if (!isElementSelectionActive || !iframeRef.current) {
      return;
    }

    const sendSelectionMode = () => {
      try {
        const iframeWindow = iframeRef.current?.contentWindow;
        if (iframeWindow) {
          iframeWindow.postMessage(
            {
              type: "coderocket-selection-mode",
              enabled: true,
              previewPath: previewPath || "/",
              isHtmlFramework: selectedFramework === Framework.HTML,
            },
            "*",
          );
        }
      } catch {
        // Ignore cross-origin errors
      }
    };

    sendSelectionMode();
  }, [previewPath, isElementSelectionActive, iframeRef, selectedFramework]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        !event.data ||
        typeof event.data !== "object" ||
        event.data.type !== "coderocket-element-selected"
      ) {
        return;
      }

      const elementData = event.data.element;
      if (elementData) {
        setSelectedElement(elementData);
        setElementSelectionActive(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    setSelectedElement,
    setElementSelectionActive,
    previewPath,
    selectedFramework,
  ]);

  useEffect(() => {
    if (!isElementSelectionActive) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setElementSelectionActive(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isElementSelectionActive, setElementSelectionActive]);

  if (!isElementSelectionActive) {
    return null;
  }

  return (
    <>
      <div
        ref={overlayRef}
        className="absolute inset-0 z-10 cursor-crosshair"
        style={{ pointerEvents: "all" }}
      />
      <Button
        variant="default"
        size="sm"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-9999"
        onClick={() => setElementSelectionActive(false)}
      >
        <X className="h-4 w-4" />
        Cancel Selection
      </Button>
    </>
  );
}
