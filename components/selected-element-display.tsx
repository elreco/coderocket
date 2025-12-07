"use client";

import { FileCode } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SelectedElementData } from "@/context/component-context";

interface SelectedElementDisplayProps {
  element: SelectedElementData;
  showClearButton?: boolean;
  onClear?: () => void;
}

export function SelectedElementDisplay({
  element,
  showClearButton = false,
  onClear,
}: SelectedElementDisplayProps) {
  return (
    <div className="border-primary/30 bg-primary/10 rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-primary text-xs font-semibold">
          Selected Element
        </span>
        {showClearButton && onClear && (
          <button
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      {element.filePath && (
        <div className="mb-2 flex items-center gap-1.5">
          <FileCode className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="text-muted-foreground font-mono text-xs">
            {element.filePath}
          </span>
        </div>
      )}
      <div className="bg-background rounded border p-2">
        <pre className="text-muted-foreground max-h-32 overflow-auto text-xs">
          {element.html.substring(0, 300)}
          {element.html.length > 300 ? "..." : ""}
        </pre>
      </div>
      {element.classes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {element.classes.slice(0, 5).map((cls, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              .{cls}
            </Badge>
          ))}
          {element.classes.length > 5 && (
            <Badge variant="outline" className="text-xs">
              +{element.classes.length - 5} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
