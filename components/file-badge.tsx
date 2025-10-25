"use client";

import { FileText, X } from "lucide-react";
import { useMemo, useEffect } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface FileBadgeProps {
  file: File;
  onRemove: () => void;
  disabled?: boolean;
}

export function FileBadge({ file, onRemove, disabled }: FileBadgeProps) {
  const fileType = file.type.startsWith("image/") ? "image" : "pdf";

  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const badge = (
    <div className="group relative flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 transition-all hover:border-primary hover:shadow-sm">
      {fileType === "image" ? (
        <img src={previewUrl} alt="" className="size-5 rounded object-cover" />
      ) : (
        <FileText className="size-4 text-muted-foreground" />
      )}
      <span className="text-sm font-medium text-foreground" title={file.name}>
        {file.name.length > 20 ? `${file.name.substring(0, 17)}...` : file.name}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onRemove();
        }}
        disabled={disabled}
        className="ml-1 rounded-full p-0.5 transition-colors hover:bg-muted"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );

  if (fileType === "image") {
    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>{badge}</HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="center"
          className="z-[9999] w-auto max-w-2xl rounded-md border-0 p-0"
        >
          <img
            src={previewUrl}
            alt={file.name}
            className="max-h-[32rem] w-auto rounded-md border-2 border-primary object-contain"
          />
        </HoverCardContent>
      </HoverCard>
    );
  }

  return badge;
}
