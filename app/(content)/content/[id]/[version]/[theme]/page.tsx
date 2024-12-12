import parse from "html-react-parser";

import { fetchAssistantMessageByChatIdAndVersion } from "@/app/(default)/components/actions";
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
    message?.content || "",
    theme || defaultTheme,
  );
  return parse(content);
}
