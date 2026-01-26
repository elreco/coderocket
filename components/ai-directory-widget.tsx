"use client";

import { X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

import { CoderocketAILogo } from "./icons/coderocket-ai-logo";

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

        <Link
          href="https://ai.coderocket.app"
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <CoderocketAILogo className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">CodeRocket AI</h3>
              <p className="text-xs text-muted-foreground">Directory</p>
            </div>
          </div>

          <p className="mb-3 text-sm text-muted-foreground">
            Discover the best{" "}
            <span className="font-medium text-foreground">
              Open Source AI Tools
            </span>{" "}
            curated for developers and creators.
          </p>

          <div className="flex items-center gap-1.5 text-xs font-medium text-primary transition-colors group-hover:text-primary/80">
            <span>Explore now</span>
            <ExternalLink className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>

      <div className="h-1 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
    </div>
  );
}
