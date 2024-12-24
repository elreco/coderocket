"use client";

import { Terminal } from "lucide-react";
import { MDXRemoteSerializeResult, MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [serializedContent, setSerializedContent] =
    useState<MDXRemoteSerializeResult | null>(null);

  useEffect(() => {
    const prepareContent = async () => {
      if (message?.content) {
        const serialized = await serialize(message.content);
        setSerializedContent(serialized);
      }
    };
    prepareContent();
  }, [message?.content]);

  const content = message?.content
    ? handleAIcompletionForHTML(message.content)
        .map((file) =>
          partialIframeBuilder(file.content, theme || defaultTheme),
        )
        .at(0) || undefined
    : undefined;

  return content ? (
    <iframe srcDoc={content} className="size-full border-none" />
  ) : (
    <div className="flex size-full flex-col items-start justify-start p-4">
      <Alert className="mx-auto mb-4 w-full max-w-2xl bg-blue-600 text-white">
        <Terminal className="size-4 bg-white text-blue-600" />
        <AlertTitle>Tailwind AI | Version #{message?.version}</AlertTitle>
        <AlertDescription>This version has no content.</AlertDescription>
      </Alert>
      {serializedContent && (
        <div className="prose w-full max-w-full whitespace-normal rounded-md border p-5 text-sm text-foreground prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:font-mono prose-pre:text-sm prose-pre:text-foreground">
          <MDXRemote {...serializedContent} />
        </div>
      )}
    </div>
  );
}
