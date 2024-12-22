"use client";

import { Tables } from "@/types_db";
import { handleAIcompletionForHTML } from "@/utils/completion-parser";
import { defaultTheme } from "@/utils/config";
import { partialIframeBuilder } from "@/utils/iframe-builder";

export default function Render({
  message,
  theme,
}: {
  message: Tables<"messages"> | null;
  theme: string;
}) {
  const content = message?.content
    ? handleAIcompletionForHTML(message.content)
        .map((file) =>
          partialIframeBuilder(file.content, theme || defaultTheme),
        )
        .at(0) || undefined
    : undefined;

  return <iframe srcDoc={content} className="size-full border-none" />;
}
