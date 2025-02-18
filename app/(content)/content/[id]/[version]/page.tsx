import { Metadata, ResolvingMetadata } from "next";

import {
  fetchAssistantMessageByChatIdAndVersion,
  fetchChatById,
  fetchFirstUserMessageByChatId,
} from "@/app/(default)/components/actions";
import RenderHtmlComponentServer from "@/components/renders/render-html-component-server";
import { extractFilesFromCompletion } from "@/utils/completion-parser";
import { Framework } from "@/utils/config";
import { capitalizeFirstLetter } from "@/utils/helpers";

interface Props {
  params: Promise<{ id: string; version: string }>;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id, version } = await params;

  const lastAssistantMessage = await fetchAssistantMessageByChatIdAndVersion(
    id,
    parseInt(version),
  );

  const firstUserMessage = await fetchFirstUserMessageByChatId(id);

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];
  return {
    title: `${capitalizeFirstLetter(
      firstUserMessage?.content?.toString() || "",
      15,
    )} - Tailwind AI`,
    openGraph: {
      images: lastAssistantMessage?.screenshot
        ? [lastAssistantMessage.screenshot]
        : [...previousImages],
    },
  };
}

export default async function Content({ params }: Props) {
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

  return chat.framework === Framework.HTML ? (
    <RenderHtmlComponentServer
      files={files}
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  ) : null;
}
