"use server";

import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

import "@/styles/crisp.css";
import {
  fetchChatById,
  fetchMessagesByChatId,
  fetchLastAssistantMessageByChatId,
  fetchLastUserMessageByChatId,
} from "../actions";

import ComponentCompletion from "./component-completion";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  const chat = await fetchChatById(slug);
  if (!chat || chat.is_private) {
    return {
      title: "Component not found",
    };
  }

  const lastAssistantMessage = await fetchLastAssistantMessageByChatId(chat.id);
  if (!lastAssistantMessage) {
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

export default async function Components({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const userData = await supabase.auth.getUser();
  const connectedUser = userData.data.user;
  const chat = await fetchChatById(slug);
  const isNotFound = chat?.is_private && chat?.user?.id !== connectedUser?.id;
  if (!chat || isNotFound) {
    return notFound();
  }
  const lastUserMessage = await fetchLastUserMessageByChatId(chat.id);
  const messages = await fetchMessagesByChatId(chat.id);
  if (!lastUserMessage || !messages) {
    return notFound();
  }

  const authorized = connectedUser?.id === chat?.user?.id;
  const user = chat?.user;

  return (
    <ComponentCompletion chatId={chat.id} authorized={authorized} user={user} />
  );
}
