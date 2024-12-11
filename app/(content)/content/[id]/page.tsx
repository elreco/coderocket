import { fetchLastAssistantMessageByChatId } from "@/app/(default)/components/actions";
import { defaultTheme } from "@/utils/config";
import { iframeBuilder } from "@/utils/iframe-builder";

export default async function Chats({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const message = await fetchLastAssistantMessageByChatId(id);
  const srcDoc = iframeBuilder(
    message?.content || "",
    id,
    message?.theme || defaultTheme,
  );
  return (
    <iframe
      className="mx-auto size-full border-none"
      srcDoc={srcDoc}
      title="Preview"
    />
  );
}
