"use server";

import { notFound } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

import { fetchChat } from "../actions";

import ChatCompletion from "./chat-completion";

export default async function Chats({ params }: { params: { id: string } }) {
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
