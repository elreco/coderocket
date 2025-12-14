"use client";

import { SiFigma } from "@icons-pack/react-simple-icons";
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
  const fileType = file.type.startsWith("image/")
    ? "image"
    : file.type === "text/plain" || file.name.endsWith(".txt")
      ? "text"
      : "pdf";

  const isFigmaFile =
    fileType === "text" && file.name.toLowerCase().includes("figma-design");

  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const badge = (
    <div className="group border-border bg-background hover:border-primary relative flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition-all hover:shadow-xs">
      {fileType === "image" ? (
        <img src={previewUrl} alt="" className="size-5 rounded object-cover" />
      ) : isFigmaFile ? (
        <SiFigma className="size-4 text-[#F24E1E]" />
      ) : (
        <FileText className="text-muted-foreground size-4" />
      )}
      <span className="text-foreground text-sm font-medium" title={file.name}>
        {file.name.length > 20 ? `${file.name.substring(0, 17)}...` : file.name}
      </span>
      {!disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-muted ml-1 rounded-full p-0.5 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );

  if (fileType === "image") {
    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>{badge}</HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="center"
          className="z-9999 w-auto max-w-2xl rounded-md border-0 p-0"
        >
          <img
            src={previewUrl}
            alt={file.name}
            className="border-primary max-h-128 w-auto rounded-md border-2 object-contain"
          />
        </HoverCardContent>
      </HoverCard>
    );
  }

  return badge;
}
