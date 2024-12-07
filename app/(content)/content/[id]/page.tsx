import { fetchLastAssistantMessageByChatId } from "@/app/(default)/components/actions";
import { ComponentType } from "@/app/api/component/schema";
import { iframeBuilder } from "@/utils/iframe-builder";

export default async function Chats({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fetchedChat = await fetchLastAssistantMessageByChatId(id);
  const srcDoc = iframeBuilder(fetchedChat?.content as ComponentType | null);
  return (
    <iframe
      className="mx-auto size-full border-none"
      srcDoc={srcDoc}
      title="Preview"
    />
  );
}
