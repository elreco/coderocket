import { Tables } from "@/types_db";
import { handleAIcompletionForHTML } from "@/utils/completion-parser";
import { defaultTheme } from "@/utils/config";
import { partialIframeBuilder } from "@/utils/iframe-builder";

export default function Render({
  message,
  theme = defaultTheme,
}: {
  message: Tables<"messages"> | null;
  theme?: string;
}) {
  const messageContent = message?.content ?? "";

  const processedContent =
    handleAIcompletionForHTML(messageContent).length > 0
      ? handleAIcompletionForHTML(messageContent)
      : [
          {
            name: "index.html",
            content: messageContent,
          },
        ];

  const iframeContent = partialIframeBuilder(processedContent, theme);

  return (
    <iframe
      srcDoc={iframeContent}
      className="size-full border-none"
      title="Content Renderer"
      sandbox="allow-scripts"
    />
  );
}
