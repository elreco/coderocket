"use client";

import { FileIcon, Trash } from "lucide-react";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  handleAIcompletionForHTML,
  hasArtifacts,
  splitContentIntoChunks,
} from "@/utils/completion-parser";
import { getRelativeDate } from "@/utils/date";

export default function ComponentFiles({
  completion,
  role,
  user,
  authorized,
  handleVersionSelect,
  handleDeleteVersion,
  selectedVersion,
  version,
  createdAt,
  isDeletable,
}: {
  completion: string;
  role: string;
  user: Tables<"users"> | null;
  authorized: boolean;
  handleVersionSelect?: (id: number) => void;
  handleDeleteVersion?: (id: number) => void;
  version?: number;
  selectedVersion?: number | null;
  createdAt: string;
  isDeletable: boolean;
}) {
  const [serializedContents, setSerializedContents] = useState<
    (MDXRemoteSerializeResult | null)[]
  >([]);

  useEffect(() => {
    const prepareContent = async () => {
      const chunks = splitContentIntoChunks(completion);

      const contents = await Promise.all(
        chunks.map(async (chunk) => {
          if (chunk.type === "text") {
            return await serialize(chunk.content);
          }
          return null;
        }),
      );

      setSerializedContents(contents);
    };

    prepareContent();
  }, [completion]);

  const hasArtifact = hasArtifacts(completion);
  const files = hasArtifact ? handleAIcompletionForHTML(completion) : [];
  const chunks = splitContentIntoChunks(completion);
  const isDeleteVersionVisible = version !== undefined && handleDeleteVersion;
  const isSelectedVersion = selectedVersion === version;

  const handleFileClick = (version: number | undefined) => {
    if (handleVersionSelect && version !== undefined) {
      handleVersionSelect(version);
    }
  };

  return (
    <div
      className={cn(
        "flex px-2 py-6 flex-col sm:px-4 hover:bg-primary/10 transition-all",
        isSelectedVersion &&
          role === "assistant" &&
          "bg-primary hover:bg-primary cursor-auto",
      )}
    >
      <div className="flex gap-2">
        {role === "assistant" ? (
          <div
            className="mr-2 flex cursor-pointer flex-col items-center gap-2"
            onClick={() => handleFileClick(version)}
          >
            <Avatar className="size-8 rounded-none">
              <AvatarImage src="/logo-white.png" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
            {isDeleteVersionVisible && isDeletable && authorized && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Trash
                    className={cn(
                      "size-4 cursor-pointer text-primary hover:text-primary/50",
                      isSelectedVersion &&
                        "text-foreground hover:text-foreground/75",
                    )}
                  />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Version</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this version?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteVersion(version)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ) : (
          <Avatar className="mr-2 size-8 rounded-lg">
            <AvatarImage
              src={user?.avatar_url || ""}
              alt={user?.full_name || ""}
            />
            <AvatarFallback className="border bg-background">
              <span className="text-xs">
                {getInitials(user?.full_name || "")}
              </span>
            </AvatarFallback>
          </Avatar>
        )}

        {role === "user" ? (
          <p className="text-sm">{completion}</p>
        ) : (
          <div className="flex w-full flex-col gap-4">
            <h2
              className={cn(
                "cursor-pointer text-lg font-semibold transition-all hover:text-foreground/75",
                isSelectedVersion && "text-foreground hover:text-foreground",
              )}
              onClick={() => handleFileClick(version)}
            >
              Version #{version}
            </h2>
            {hasArtifact ? (
              chunks.map((chunk, index) => (
                <div key={index}>
                  {chunk.type === "text" && serializedContents[index] && (
                    <div className="prose w-full max-w-full whitespace-normal text-sm text-foreground prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:font-mono prose-pre:text-sm prose-pre:text-foreground">
                      <MDXRemote {...serializedContents[index]} />
                    </div>
                  )}
                  {chunk.type === "artifact" && (
                    <div className="w-full space-y-2">
                      <div className="rounded-lg border bg-background p-4 text-foreground">
                        <h3 className="mb-4 font-semibold">Files generated</h3>
                        <div className="space-y-4">
                          {files.map((file, index) => (
                            <div
                              key={index}
                              className="flex cursor-pointer items-center rounded bg-foreground p-4 transition-all hover:bg-foreground/80"
                              onClick={() => handleFileClick(version)}
                            >
                              <FileIcon className="mr-2 size-4 text-primary" />
                              <div className="font-mono text-sm text-primary">
                                {file.name || "untitled.html"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="prose w-full max-w-full whitespace-normal text-sm text-foreground prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:font-mono prose-pre:text-sm prose-pre:text-foreground">
                {serializedContents[0] && (
                  <MDXRemote {...serializedContents[0]} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <p
        className={cn(
          "mt-2 text-right text-xs font-semibold text-primary",
          isSelectedVersion && "text-foreground",
        )}
      >
        {getRelativeDate(createdAt)}
      </p>
    </div>
  );
}
