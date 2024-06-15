import Image from "next/image";
import Link from "next/link";

import type { Chat } from "@/app/(default)/chats/types";
import { getRelativeDate } from "@/utils/date";
import { capitalizeFirstLetter } from "@/utils/helpers";

import { Badge } from "./ui/badge";

export default function ChatCard({ chat }: { chat: Chat }) {
  return (
    chat?.last_assistant_message?.screenshot && (
      <div key={chat.chat_id} className="relative aspect-video w-full">
        <Image
          src={chat.last_assistant_message.screenshot}
          fill
          className="w-full rounded-md border object-cover shadow-md"
          alt=""
        />
        <Link
          href={`/chats/${chat.chat_id}`}
          className="absolute inset-0 z-10 flex cursor-pointer select-none items-center justify-center rounded-md bg-black/25 transition-all duration-300 hover:bg-transparent"
        >
          <Badge className="absolute bottom-0 right-0 m-4" variant="secondary">
            {capitalizeFirstLetter(chat.first_user_message.content, 25)}
          </Badge>
          {chat.user_full_name && (
            <Badge
              className="absolute left-0 top-0 m-4 text-indigo-500"
              variant="default"
            >
              {chat.user_full_name}
            </Badge>
          )}
          {chat.created_at && (
            <Badge
              className="absolute right-0 top-0 m-4 !text-gray-500"
              variant="default"
            >
              {getRelativeDate(chat.created_at)}
            </Badge>
          )}
        </Link>
      </div>
    )
  );
}
