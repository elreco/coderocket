"use client";

import { FileIcon } from "lucide-react";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  handleAIcompletionForHTML,
  hasArtifacts,
  splitContentIntoChunks,
} from "@/utils/completion-parser";

function ClientComponentFiles({
  completion,
  role,
  user,
}: {
  completion: string;
  role: string;
  user: Tables<"users"> | null;
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

  return (
    <div className="flex px-2 py-6 sm:px-4">
      {role === "assistant" ? (
        <Avatar className="mr-2 size-8 rounded-none">
          <AvatarImage src="/logo-white.png" />
          <AvatarFallback>T</AvatarFallback>
        </Avatar>
      ) : (
        <Avatar className="mr-2 size-8 rounded-lg">
          <AvatarImage
            src={user?.avatar_url || ""}
            alt={user?.full_name || ""}
          />
          <AvatarFallback className="rounded-lg">
            {getInitials(user?.full_name || "")}
          </AvatarFallback>
        </Avatar>
      )}

      {role === "user" ? (
        <p className="text-sm">{completion}</p>
      ) : (
        <div className="flex w-full flex-col gap-4">
          {hasArtifact &&
            chunks.map((chunk, index) => (
              <div key={index}>
                {chunk.type === "text" && serializedContents[index] && (
                  <div className="prose w-full max-w-full whitespace-normal text-sm text-foreground prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:font-mono prose-pre:text-sm prose-pre:text-foreground">
                    <MDXRemote {...serializedContents[index]!} />
                  </div>
                )}
                {chunk.type === "artifact" && (
                  <div className="w-full space-y-2">
                    <div className="rounded-lg border bg-accent p-4 text-foreground">
                      <h3 className="mb-4 font-semibold">Files generated</h3>
                      <div className="space-y-4">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center rounded border bg-foreground p-4"
                          >
                            <FileIcon className="mr-2 size-4" />
                            <div className="mb-2 font-mono text-sm text-muted-foreground">
                              {file.name || "untitled.html"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// Composant d'export par défaut
export default ClientComponentFiles;
