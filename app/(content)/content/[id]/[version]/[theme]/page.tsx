import { fetchAssistantMessageByChatIdAndVersion } from "@/app/(default)/components/actions";

import Render from "./render";

export default async function Chats({
  params,
}: {
  params: Promise<{ id: string; version: number; theme: string }>;
}) {
  const { id, version, theme } = await params;
  const message = await fetchAssistantMessageByChatIdAndVersion(id, version);

  return <Render message={message} theme={theme} />;
}
