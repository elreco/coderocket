"use client";

import clsx from "clsx";
import Link from "next/link";
import { ChatCompletionMessageParam } from "openai/resources";

import { Badge } from "@/components/ui/badge";

interface Props {
  chats: {
    chat_id: string;
    image_url: string;
    user_id: string;
    user_full_name: string;
    first_user_message: ChatCompletionMessageParam;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    last_assistant_message: any;
  }[];
}

export default function Chats({ chats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {chats?.map(
        (c) =>
          c?.last_assistant_message?.screenshot && (
            <div
              key={c.chat_id}
              className="relative w-full rounded-md bg-transparent"
            >
              <img
                alt=""
                src={c?.last_assistant_message?.screenshot || ""}
                className={clsx(
                  "aspect-video w-full rounded-md border border-gray-900 object-cover",
                )}
              />
              <Link
                href={`/chats/${c.chat_id}`}
                className="absolute inset-0 z-10 flex cursor-pointer select-none items-center justify-center rounded-md bg-black/25 transition-all duration-300 hover:bg-transparent"
              >
                <Badge
                  className="absolute bottom-0 right-0 m-4"
                  variant="secondary"
                >
                  {c.first_user_message.content?.slice(0, 100) as string}
                </Badge>
                {c.user_full_name && (
                  <Badge
                    className="absolute left-0 top-0 m-4 text-indigo-500"
                    variant="default"
                  >
                    {c.user_full_name}
                  </Badge>
                )}
              </Link>
            </div>
          ),
      )}
    </div>
  );
}
