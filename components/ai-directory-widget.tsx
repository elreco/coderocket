"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";

const STORAGE_KEY = "ai-directory-widget-closed";

export function AIDirectoryWidget() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const isClosed = localStorage.getItem(STORAGE_KEY);
    if (!isClosed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(STORAGE_KEY, "true");
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-72 overflow-hidden rounded-xl border border-primary/20 bg-card/95 shadow-lg backdrop-blur-md transition-all duration-300 ${
        isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="relative p-4">
        <button
          onClick={handleClose}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="h-1 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
    </div>
  );
}
