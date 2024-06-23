"use server";

import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

import { capitalizeFirstLetter } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";

import { fetchChat } from "../actions";

import ChatCompletion from "./chat-completion";

type Props = {
  params: { id: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const id = params.id;
  const chat = await fetchChat(id);

  const lastCompletionMessage = chat?.messages
    .slice()
    .reverse()
    .find((message) => message.role === "assistant");

  const firstUserMessage = chat?.messages
    .slice()
    .find((message) => message.role === "user");

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${capitalizeFirstLetter(
      firstUserMessage?.content || "",
      15,
    )} - Tailwind AI`,
    openGraph: {
      images: [lastCompletionMessage?.screenshot || "", ...previousImages],
    },
  };
}

export default async function Chats({ params }: Props) {
  const chat = await fetchChat(params.id);

  const supabase = createClient();
  const userData = await supabase.auth.getUser();
  const user = userData.data.user;
  const authorized = user?.id === chat?.user_id?.id;
  const userFullName = chat?.user_id?.full_name || "";
  const userAvatar = chat?.user_id?.avatar_url || "";
  const isNotFound = chat?.is_private && chat?.user_id?.id !== user?.id;
  if (!chat || isNotFound) {
    return notFound();
  }
  const defaultCompletion =
    chat?.messages
      .slice()
      .reverse()
      .find((message) => message.role === "assistant")?.content || "";

  const defaultVisibility = !chat?.is_private;
  const defaultTitle =
    chat?.messages
      .slice()
      .reverse()
      .find((message) => message.role === "user")?.content || "";
  const defaultSelectedVersion =
    chat.messages
      .slice()
      .reverse()
      .find((message) => message.role === "assistant")?.id || "";
  const defaultMessages = chat.messages;
  const defaultMessage =
    defaultMessages.length === 1
      ? defaultMessages.find((m) => m.role === "user")?.content || ""
      : "";

  return (
    <ChatCompletion
      fetchedChat={chat}
      authorized={authorized}
      userAvatar={userAvatar}
      userFullName={userFullName}
      defaultCompletion={defaultCompletion}
      defaultVisibility={defaultVisibility}
      defaultTitle={defaultTitle}
      defaultSelectedVersion={defaultSelectedVersion}
      defaultMessages={defaultMessages}
      defaultMessage={defaultMessage}
    />
  );
}
