import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

import {
  fetchAssistantMessageByChatIdAndVersion,
  fetchChatById,
} from "@/app/(default)/components/actions";
import RenderHtmlComponentServer from "@/components/renders/render-html-component-server";
import { Watermark } from "@/components/watermark";
import { extractFilesFromCompletion } from "@/utils/completion-parser";

interface Props {
  params: Promise<{ id: string; version: string }>;
  searchParams: Promise<{ noWatermark?: string }>;
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

  if (!lastAssistantMessage) {
    return {
      title: "Component not found",
    };
  }

  const chat = await fetchChatById(id);
  if (!chat || chat.is_private) {
    return {
      title: "Component not found",
    };
  }
  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];
  return {
    title: chat.title
      ? `${chat.title} - Tailwind AI`
      : `Component ${chat.slug} - Tailwind AI`,
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
  if (!chat || chat.is_private) {
    return notFound();
  }
  const lastAssistantMessage = await fetchAssistantMessageByChatIdAndVersion(
    id,
    parseInt(version),
  );

  if (!lastAssistantMessage) {
    return <div>No content found</div>;
  }

  const files = extractFilesFromCompletion(lastAssistantMessage.content);

  return (
    <>
      {!noWatermark && <Watermark slug={chat.slug || ""} />}
      <RenderHtmlComponentServer
        files={files}
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </>
  );
}
