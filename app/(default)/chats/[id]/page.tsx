"use server";

import { notFound } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

import { fetchChat } from "../actions";

import ChatCompletion from "./chat-completion";

export default async function Chats({ params }: { params: { id: string } }) {
  const chat = await fetchChat(params.id);
  if (!chat) {
    return notFound();
  }
  const supabase = createClient();
  const user = await supabase.auth.getUser();
  return <ChatCompletion fetchedChat={chat} user={user.data.user} />;
}
