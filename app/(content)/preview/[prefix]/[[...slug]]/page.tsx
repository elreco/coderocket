import { Metadata, ResolvingMetadata } from "next";

import {
  fetchAssistantMessageByChatIdAndVersion,
  fetchChatById,
} from "@/app/(default)/components/actions";
import { Watermark } from "@/components/watermark";

interface Props {
  params: Promise<{ prefix: string; slug?: string[] }>;
  searchParams: Promise<{ watermark?: string }>;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { prefix } = await params;
  const parts = prefix.split("-");
  const versionNumber = Number(parts.pop());
  const id = parts.join("-");

  const lastAssistantMessage = await fetchAssistantMessageByChatIdAndVersion(
    id,
    versionNumber,
  );

  if (!lastAssistantMessage) {
    return {
      title: "Component not found",
    };
  }

  const chat = await fetchChatById(id);
  if (!chat) {
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

export default async function Page({ params }: Props) {
  const { prefix, slug } = await params;
  const parts = prefix.split("-");
  parts.pop();
  const id = parts.join("-");
  const chat = await fetchChatById(id);
  return (
    <div className="size-full">
      <Watermark slug={chat.slug} />
      <iframe
        className="size-full border-none"
        src={`https://${prefix}.webcontainer.tailwindai.dev/${slug ? slug.join("/") : ""}`}
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
        allow="credentialless"
        loading="eager"
      />
    </div>
  );
}
