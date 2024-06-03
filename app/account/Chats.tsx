"use client";

import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
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
    last_assistant_message: ChatCompletionMessageParam;
  }[];
}

const externalResources = [
  "https://unpkg.com/tailwindcss-cdn@3.4.3/tailwindcss-with-all-plugins.js",
  "https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css",
];

export default function Chats({ chats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {chats?.map((c) => (
        <SandpackProvider
          key={c.chat_id}
          theme="light"
          options={{
            externalResources,
          }}
          template="static"
          files={{
            "/index.html": (c.last_assistant_message?.content as string) || "",
          }}
        >
          <div className={clsx("rounded-md bg-transparent")}>
            <SandpackLayout>
              <SandpackPreview className="!h-58" />
              <Link
                href={`/chats/${c.chat_id}`}
                className="absolute inset-0 z-10 flex cursor-pointer  select-none items-center justify-center bg-black/25 hover:bg-black/20  "
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
            </SandpackLayout>
          </div>
        </SandpackProvider>
      ))}
    </div>
  );
}
