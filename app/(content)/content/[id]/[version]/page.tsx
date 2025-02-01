import {
  fetchAssistantMessageByChatIdAndVersion,
  fetchChatById,
} from "@/app/(default)/components/actions";
import RenderHtmlComponentServer from "@/components/renders/render-html-component-server";
import { extractFilesFromCompletion } from "@/utils/completion-parser";

export default async function Content({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version } = await params;
  const chat = await fetchChatById(id);
  const lastAssistantMessage = await fetchAssistantMessageByChatIdAndVersion(
    id,
    parseInt(version),
  );

  if (!lastAssistantMessage) {
    return <div>No content found</div>;
  }

  const files = extractFilesFromCompletion(lastAssistantMessage.content);

  return chat.framework === "html" ? (
    <RenderHtmlComponentServer
      files={files}
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  ) : null;
}
