import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

import {
  fetchAssistantMessageByChatIdAndVersion,
  fetchChatById,
} from "@/app/(default)/components/actions";
import RenderHtmlComponent from "@/components/renders/render-html-component";
import { Watermark } from "@/components/watermark";
import {
  extractFilesFromArtifact,
  getUpdatedArtifactCode,
} from "@/utils/completion-parser";

interface Props {
  params: Promise<{ id: string; version: string }>;
  searchParams: Promise<{ noWatermark?: string }>;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id, version } = await params;

  const chat = await fetchChatById(id);
  if (!chat) {
    return {
      title: "Component not found",
    };
  }

  const lastAssistantMessage = await fetchAssistantMessageByChatIdAndVersion(
    id,
    parseInt(version),
  );

  if (!lastAssistantMessage) {
    return {
      title: "Generating content...",
    };
  }
  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];
  return {
    title: chat.title
      ? `${chat.title} - CodeRocket`
      : `Component ${chat.slug} - CodeRocket`,
    openGraph: {
      images: lastAssistantMessage?.screenshot
        ? [lastAssistantMessage.screenshot]
        : [...previousImages],
    },
  };
}

export default async function Content({ params, searchParams }: Props) {
  const { id, version } = await params;
  const { noWatermark } = await searchParams;
  const chat = await fetchChatById(id);
  if (!chat) {
    return notFound();
  }
  const lastAssistantMessage = await fetchAssistantMessageByChatIdAndVersion(
    id,
    parseInt(version),
  );

  if (!lastAssistantMessage) {
    return <div>No content found</div>;
  }

  const newArtifactCode = getUpdatedArtifactCode(
    lastAssistantMessage.content,
    chat.artifact_code || "",
  );
  const files = extractFilesFromArtifact(newArtifactCode);
  return (
    <>
      {!noWatermark && <Watermark slug={chat.slug || ""} />}
      <RenderHtmlComponent files={files} />
    </>
  );
}
