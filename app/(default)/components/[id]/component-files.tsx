import { FileIcon } from "lucide-react";

import {
  handleAIcompletionForHTML,
  hasArtifacts,
} from "@/utils/completion-parser";

export default function ComponentFiles({ completion }: { completion: string }) {
  const hasArtifact = hasArtifacts(completion);
  const files = hasArtifact ? handleAIcompletionForHTML(completion) : [];

  if (!hasArtifact) return null;

  return (
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
  );
}
