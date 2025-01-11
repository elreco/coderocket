import { fetchLastAssistantMessageByChatId } from "@/app/(default)/components/actions";
import { extractFilesFromCompletion } from "@/utils/completion-parser";

import RenderHtmlComponentServer from "../../render-html-component-server";

export default async function Content({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lastAssistantMessage = await fetchLastAssistantMessageByChatId(id);

  if (!lastAssistantMessage) {
    return <div>No content found</div>;
  }

  const files = extractFilesFromCompletion(lastAssistantMessage.content);

  return (
    <RenderHtmlComponentServer
      files={files}
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  );
}
