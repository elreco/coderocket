"use server";

import { notFound } from "next/navigation";

import { fetchChat } from "../actions";

import ChatCompletion from "./chat-completion";

export default async function Chats({ params }: { params: { id: string } }) {
  const chat = await fetchChat(params.id);
  if (!chat) {
    return notFound();
  }
  return <ChatCompletion fetchedChat={chat} />;
}
