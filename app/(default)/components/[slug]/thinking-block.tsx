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
    <div className="border-muted-foreground/20 bg-muted/30 my-4 rounded-lg border transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="hover:bg-muted/50 flex w-full items-center gap-2 px-4 py-3 text-left transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="text-muted-foreground size-4" />
        ) : (
          <ChevronRight className="text-muted-foreground size-4" />
        )}
        <Brain className="text-muted-foreground size-4" />
        <span className="text-muted-foreground text-sm font-medium">
          Thinking process
        </span>
        <span className="text-muted-foreground/60 ml-auto text-xs">
          {isExpanded ? "Hide" : "Show"}
        </span>
      </button>

      {isExpanded && (
        <div className="border-muted-foreground/20 border-t px-4 py-3">
          <div className="prose prose-sm text-muted-foreground dark:prose-invert *:text-muted-foreground max-w-none">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
