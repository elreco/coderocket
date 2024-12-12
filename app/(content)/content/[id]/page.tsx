import parse from "html-react-parser";

import { fetchLastAssistantMessageByChatId } from "@/app/(default)/components/actions";
import { defaultTheme } from "@/utils/config";
import { partialIframeBuilder } from "@/utils/iframe-builder";

export default async function Chats({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const message = await fetchLastAssistantMessageByChatId(id);
  const content = partialIframeBuilder(
    message?.content || "",
    message?.theme || defaultTheme,
  );
  return parse(content);
}
