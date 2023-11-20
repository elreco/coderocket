"use client";
import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { githubLight } from "@codesandbox/sandpack-themes";
import clsx from "clsx";
import Link from "next/link";
import { ChatCompletionMessageParam } from "openai/resources";
import { useEffect, useState } from "react";

import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";

import { useSupabase } from "../supabase-provider";

interface Chat {
  chat_id: string;
  user_id: string;
  user_full_name: string;
  first_user_message: ChatCompletionMessageParam;
  last_assistant_message: ChatCompletionMessageParam;
}

const externalResources = [
  "https://unpkg.com/tailwindcss-cdn@3.3.4/tailwindcss-with-all-plugins.js",
];
const page = 1;
const pageSize = 12;

export default function Featured() {
  const [chats, setChats] = useState<Chat[]>([]);
  const { supabase } = useSupabase();

  useEffect(() => {
    const getData = async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data } = await supabase.rpc("get_all_chats").range(from, to);
      if (data?.length) {
        setChats(data);
      }
    };
    getData();
  }, []);
  return (
    <>
      <Container className="pt-24">
        <h1 className="mb-10 text-4xl font-bold text-gray-700 sm:text-center sm:text-6xl">
          Featured Components
        </h1>
        <div className="grid 2xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-3">
          {chats?.map((c) => (
            <SandpackProvider
              key={c.chat_id}
              theme={githubLight}
              options={{
                externalResources,
              }}
              template="static"
              files={{
                "/index.html":
                  (c.last_assistant_message?.content as string) || "",
              }}
            >
              <div className={clsx("bg-transparent rounded-md")}>
                <SandpackLayout>
                  <SandpackPreview className="!h-58" />
                  <Link
                    href={`/chats/${c.chat_id}`}
                    className="absolute inset-0 z-10 bg-black/25 hover:bg-black/20  flex cursor-pointer select-none items-center justify-center  "
                  >
                    <Badge
                      className="absolute bottom-0 right-0 m-4"
                      variant="secondary"
                    >
                      {c.first_user_message.content?.slice(0, 100) as string}
                    </Badge>
                    <Badge
                      className="absolute top-0 left-0 m-4 text-indigo-500"
                      variant="default"
                    >
                      {c.user_full_name}
                    </Badge>
                  </Link>
                </SandpackLayout>
              </div>
            </SandpackProvider>
          ))}
        </div>
      </Container>
    </>
  );
}
