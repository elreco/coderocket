import { FileIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Tables } from "@/types_db";
import {
  handleAIcompletionForHTML,
  hasArtifacts,
  splitContentIntoChunks,
} from "@/utils/completion-parser";

export default function ComponentFiles({
  completion,
  role,
  user,
}: {
  completion: string;
  role: string;
  user: Tables<"users"> | null;
}) {
  const hasArtifact = hasArtifacts(completion);
  const files = hasArtifact ? handleAIcompletionForHTML(completion) : [];

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

      <div className="flex w-full flex-col gap-4">
        {role === "user" && <p className="text-sm">{completion} qffqs</p>}
        {hasArtifact &&
          splitContentIntoChunks(completion).map((chunk, index) => (
            <div key={index}>
              {chunk.type === "text" && (
                <div className="whitespace-pre-wrap text-sm">
                  {chunk.content}
                </div>
              )}
              {chunk.type === "artifact" && (
                <div className="w-full space-y-2">
                  <div className="rounded-lg border bg-primary p-4 text-foreground">
                    <h3 className="mb-4 font-semibold">Files generated</h3>
                    <div className="space-y-4">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center rounded border bg-white p-4"
                        >
                          <FileIcon className="mr-2 size-4" />
                          <div className="mb-2 font-mono text-sm text-gray-600">
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
    </div>
  );
}
