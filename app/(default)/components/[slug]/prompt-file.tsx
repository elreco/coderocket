"use client";

import { FileText } from "lucide-react";
import { useMemo, useEffect } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface FileInfo {
  url: string;
  type: "image" | "pdf";
  isLocal: boolean;
  name: string;
}

interface PromptFilesProps {
  files?: File[];
  fileUrls?: string[];
  storageUrl?: string;
}

export function PromptFiles({
  files = [],
  fileUrls = [],
  storageUrl,
}: PromptFilesProps) {
  const fileInfos = useMemo(() => {
    const infos: FileInfo[] = [];

    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith("image/") ? "image" : "pdf";
      infos.push({ url, type, isLocal: true, name: file.name });
    });

    fileUrls.forEach((url) => {
      const fullUrl = storageUrl ? `${storageUrl}/${url}` : url;
      const type = url.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
      const fileName = url.split("/").pop() || url;
      infos.push({ url: fullUrl, type, isLocal: false, name: fileName });
    });

    return infos;
  }, [files, fileUrls, storageUrl]);

  useEffect(() => {
    return () => {
      if (files.length > 0) {
        fileInfos
          .filter((info) => info.isLocal)
          .forEach((info) => {
            URL.revokeObjectURL(info.url);
          });
      }
    };
  }, [fileInfos, files.length]);

  if (fileInfos.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {fileInfos.map((fileInfo, index) => {
        const badge = (
          <div
            key={index}
            className="group relative flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 transition-all hover:border-primary hover:shadow-sm"
          >
            {fileInfo.type === "image" ? (
              <img
                src={fileInfo.url}
                alt={fileInfo.name}
                className="size-5 rounded object-cover"
              />
            ) : (
              <FileText className="size-4 text-muted-foreground" />
            )}
            <span
              className="text-sm font-medium text-foreground"
              title={fileInfo.name}
            >
              {fileInfo.name.length > 20
                ? `${fileInfo.name.substring(0, 17)}...`
                : fileInfo.name}
            </span>
          </div>
        );

        if (fileInfo.type === "image") {
          return (
            <HoverCard key={index} openDelay={200}>
              <HoverCardTrigger asChild>{badge}</HoverCardTrigger>
              <HoverCardContent
                side="top"
                align="center"
                className="z-[9999] w-auto max-w-2xl rounded-md border-2 border-primary p-0"
              >
                <img
                  src={fileInfo.url}
                  alt={fileInfo.name}
                  className="max-h-[32rem] w-auto rounded-md object-contain"
                />
              </HoverCardContent>
            </HoverCard>
          );
        }

        return badge;
      })}
    </div>
  );
}
