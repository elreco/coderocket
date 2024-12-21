import { fetchAssistantMessageByChatIdAndVersion } from "@/app/(default)/components/actions";
import { handleAIResponseForHTML } from "@/utils/completion-parser";
import { defaultTheme } from "@/utils/config";
import { partialIframeBuilder } from "@/utils/iframe-builder";

export default async function Chats({
  params,
}: {
  params: Promise<{ id: string; version: number; theme: string }>;
}) {
  const { id, version, theme } = await params;
  const message = await fetchAssistantMessageByChatIdAndVersion(id, version);
  const content = partialIframeBuilder(
    handleAIResponseForHTML(message?.content || "")[0].content,
    theme || defaultTheme,
  );
  return <iframe srcDoc={content} className="size-full border-none" />;
}
