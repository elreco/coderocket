"use client";

import { Globe, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn, truncateMiddle } from "@/lib/utils";

interface CloneStatusCardProps {
  url: string;
  isScraping?: boolean;
  userContext?: string | null;
  className?: string;
}

export function CloneStatusCard({
  url,
  isScraping = false,
  userContext,
  className,
}: CloneStatusCardProps) {
  const cleanUrl = url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

  return (
    <div
      className={cn(
        "rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-950/30",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Globe className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Cloning website
            </span>
            {isScraping && (
              <Badge
                variant="secondary"
                className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
              >
                <Loader2 className="size-3 animate-spin" />
                Analyzing...
              </Badge>
            )}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate text-xs text-blue-500 hover:text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            title={url}
          >
            {truncateMiddle(cleanUrl, 50)}
          </a>
          {userContext && (
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              {userContext}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
