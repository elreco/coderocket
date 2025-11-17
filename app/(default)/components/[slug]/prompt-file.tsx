"use client";

import { SiFigma } from "@icons-pack/react-simple-icons";
import { FileText } from "lucide-react";
import { useMemo, useEffect } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface FileInfo {
  url: string;
  type: "image" | "pdf" | "text";
  isLocal: boolean;
  name: string;
  source?: string;
}

interface PromptFilesProps {
  files?: File[];
  fileUrls?: string[];
  fileItems?: Array<{
    url: string;
    order: number;
    type?: string;
    mimeType?: string;
    source?: string;
  }>;
  storageUrl?: string;
}

export function PromptFiles({
  files = [],
  fileUrls = [],
  fileItems = [],
  storageUrl,
}: PromptFilesProps) {
  const fileInfos = useMemo(() => {
    const infos: FileInfo[] = [];

    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      let type: "image" | "pdf" | "text" = "image";
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        type = "text";
      } else if (
        file.type === "application/pdf" ||
        file.name.endsWith(".pdf")
      ) {
        type = "pdf";
      } else if (file.type.startsWith("image/")) {
        type = "image";
      }
      const isFigmaFile = file.name.toLowerCase().includes("figma-design");
      infos.push({
        url,
        type,
        isLocal: true,
        name: file.name,
        source: isFigmaFile ? "figma" : undefined,
      });
    });

    if (fileItems.length > 0) {
      fileItems.forEach((item) => {
        const fullUrl = storageUrl ? `${storageUrl}/${item.url}` : item.url;
        const fileName = item.url.split("/").pop() || item.url;
        let type: "image" | "pdf" | "text" = "image";
        if (item.type) {
          type = item.type as "image" | "pdf" | "text";
        } else if (fileName.endsWith(".txt")) {
          type = "text";
        } else if (fileName.endsWith(".pdf")) {
          type = "pdf";
        }
        infos.push({
          url: fullUrl,
          type,
          isLocal: false,
          name: fileName,
          source: item.source,
        });
      });
    } else {
      fileUrls.forEach((url) => {
        const fullUrl = storageUrl ? `${storageUrl}/${url}` : url;
        const fileName = url.split("/").pop() || url;
        let type: "image" | "pdf" | "text" = "image";
        if (fileName.endsWith(".txt")) {
          type = "text";
        } else if (fileName.endsWith(".pdf")) {
          type = "pdf";
        }
        infos.push({ url: fullUrl, type, isLocal: false, name: fileName });
      });
    }

    return infos;
  }, [files, fileUrls, fileItems, storageUrl]);

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
        const isFigmaFile =
          fileInfo.source === "figma" ||
          (fileInfo.type === "text" &&
            fileInfo.name.toLowerCase().includes("figma-design"));

        const badge = (
          <div
            key={index}
            className="group border-border bg-background hover:border-primary relative flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition-all hover:shadow-xs"
          >
            {fileInfo.type === "image" ? (
              <img
                src={fileInfo.url}
                alt={fileInfo.name}
                className="size-5 rounded object-cover"
              />
            ) : isFigmaFile ? (
              <SiFigma className="size-4 text-[#F24E1E]" />
            ) : (
              <FileText className="text-muted-foreground size-4" />
            )}
            <span
              className="text-foreground text-sm font-medium"
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
                className="border-primary z-9999 w-auto max-w-2xl rounded-md border-2 p-0"
              >
                <img
                  src={fileInfo.url}
                  alt={fileInfo.name}
                  className="max-h-128 w-auto rounded-md object-contain"
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
