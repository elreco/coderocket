"use client";
import React from "react";

import { HeroParallax } from "@/components/ui/hero-parallax";
import { capitalizeFirstLetter } from "@/utils/helpers";

import { Chat } from "./chats/types";

export default function Parallax({ chats }: { chats: Chat[] }) {
  const products = chats.map((chat) => ({
    title: capitalizeFirstLetter(chat.first_user_message.content, 25),
    link: `/chats/${chat.chat_id}`,
    thumbnail: chat.last_assistant_message.screenshot,
  }));
  return <HeroParallax products={products} />;
}
