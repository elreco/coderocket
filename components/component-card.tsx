import Image from "next/image";
import Link from "next/link";

import { getRelativeDate } from "@/utils/date";
import { capitalizeFirstLetter } from "@/utils/helpers";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

type GetComponentsReturnType = {
  chat_id: string;
  user_id: string;
  user_full_name: string;
  is_featured: boolean;
  is_private: boolean;
  created_at: string;
  first_user_message: string;
  last_assistant_message: string;
};

export default function ComponentCard({
  chat,
}: {
  chat: GetComponentsReturnType;
}) {
  return (
    <HoverCard key={chat.chat_id}>
      <HoverCardTrigger asChild>
        <div className="relative aspect-video w-full">
          {chat.last_assistant_message && (
            <Image
              src={chat.last_assistant_message}
              fill
              className="w-full rounded-md border object-cover shadow-md"
              alt=""
            />
          )}
          <Link
            href={`/components/${chat.chat_id}`}
            className="group absolute inset-0 z-10 flex cursor-pointer select-none items-end justify-end rounded-md bg-background/25 transition-all duration-300 hover:bg-transparent"
          >
            <h2 className="m-2 text-xs font-semibold text-foreground group-hover:hidden">
              {capitalizeFirstLetter(chat.first_user_message, 50)}
            </h2>
          </Link>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <p className="mb-1">{chat.first_user_message}</p>
        <p className="text-sm font-medium text-muted-foreground">
          {getRelativeDate(chat.created_at)}
          {chat.user_full_name && ` by ${chat.user_full_name}`}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
