"use client";

import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Markdown } from "./markdown";

interface ThinkingBlockProps {
  content: string;
}

export function ThinkingBlock({ content }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="my-4 rounded-lg border border-muted-foreground/20 bg-muted/30 transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        {isExpanded ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <Brain className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Thinking process
        </span>
        <span className="ml-auto text-xs text-muted-foreground/60">
          {isExpanded ? "Hide" : "Show"}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-muted-foreground/20 px-4 py-3">
          <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert [&>*]:text-muted-foreground">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
