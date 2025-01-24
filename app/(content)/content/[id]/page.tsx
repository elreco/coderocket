import {
  fetchChatById,
  fetchLastAssistantMessageByChatId,
} from "@/app/(default)/components/actions";
import RenderHtmlComponentServer from "@/components/renders/render-html-component-server";
import RenderReactComponent from "@/components/renders/render-react-component";
import {
  extractFilesFromArtifact,
  extractFilesFromCompletion,
} from "@/utils/completion-parser";

export default async function Content({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chat = await fetchChatById(id);
  const lastAssistantMessage = await fetchLastAssistantMessageByChatId(id);

  if (!lastAssistantMessage) {
    return <div>No content found</div>;
  }

  const files = extractFilesFromCompletion(lastAssistantMessage.content);
  const artifactFiles = extractFilesFromArtifact(chat.artifact_code || "");

  return chat.framework === "html" ? (
    <RenderHtmlComponentServer
      files={files}
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  ) : (
    <RenderReactComponent files={artifactFiles} />
  );
}
