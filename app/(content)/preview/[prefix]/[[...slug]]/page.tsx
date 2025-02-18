import { Metadata, ResolvingMetadata } from "next";

import { Watermark } from "@/components/watermark";

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  const chat = await fetchAssistantMessageByChatIdAndVersion(slug);

  const lastAssistantMessage = await fetchLastAssistantMessageByChatId(chat.id);

  const firstUserMessage = await fetchFirstUserMessageByChatId(chat.id);

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

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ prefix: string; slug?: string[] }>;
  searchParams: Promise<{ watermark?: string }>;
}) {
  const { prefix, slug } = await params;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { watermark } = await searchParams;

  return (
    <div className="size-full">
      <Watermark />
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
