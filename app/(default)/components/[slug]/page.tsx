"use server";

import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

import { capitalizeFirstLetter } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";

import "@/styles/crisp.css";
import {
  fetchChatById,
  fetchMessagesByChatId,
  fetchLastAssistantMessageByChatId,
  fetchLastUserMessageByChatId,
  fetchFirstUserMessageByChatId,
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

export default async function Components({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const userData = await supabase.auth.getUser();
  const connectedUser = userData.data.user;
  const chat = await fetchChatById(slug);
  const isNotFound = chat.is_private && chat.user?.id !== connectedUser?.id;

  if (!chat || isNotFound) {
    return notFound();
  }
  const lastAssistantMessage = await fetchLastAssistantMessageByChatId(chat.id);
  const lastUserMessage = await fetchLastUserMessageByChatId(chat.id);
  const messages = await fetchMessagesByChatId(chat.id);

  if (!lastUserMessage || !messages) {
    return notFound();
  }

  const authorized = connectedUser?.id === chat?.user?.id;
  const user = chat?.user;

  return (
    <ComponentCompletion
      fetchedChat={chat}
      fetchedMessages={messages}
      authorized={authorized}
      user={user}
      lastAssistantMessage={lastAssistantMessage}
      lastUserMessage={lastUserMessage}
    />
  );
}
