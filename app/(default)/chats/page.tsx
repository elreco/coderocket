"use client";

import Image from "next/image";
import Link from "next/link";
import { ChatCompletionMessageParam } from "openai/resources";
import { useEffect, useState } from "react";

import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { capitalizeFirstLetter } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/client";

interface Chat {
  chat_id: string;
  image_url: string;
  user_id: string;
  user_full_name: string;
  first_user_message: ChatCompletionMessageParam;
  last_assistant_message: ChatCompletionMessageParam;
}

const page = 1;
const pageSize = 12;

export default function Featured() {
  const [chats, setChats] = useState<Chat[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const getData = async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data } = await supabase
        .rpc("get_all_chats")
        .not("image_url", "is", null)
        .range(from, to);
      if (data?.length) {
        setChats(data);
      }
    };
    getData();
  }, []);
  return (
    <Container>
      <h1 className="mb-1 text-lg font-medium text-gray-700 sm:text-left sm:text-2xl">
        Featured Components
      </h1>
      <h2 className="mb-10 text-lg text-gray-700 sm:text-left sm:text-xl">
        Handpicked components for your projects
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {chats?.map((c) => (
          <div key={c.chat_id} className="relative aspect-video w-full">
            <Image
              src={c.image_url}
              fill
              className="w-full rounded-md border object-contain shadow-md"
              alt=""
            />
            <Link
              href={`/chats/${c.chat_id}`}
              className="absolute inset-0 z-10 flex cursor-pointer select-none items-center justify-center rounded-md bg-black/25 transition-all duration-300 hover:bg-transparent"
            >
              <Badge
                className="absolute bottom-0 right-0 m-4"
                variant="secondary"
              >
                {capitalizeFirstLetter(
                  c.first_user_message.content?.slice(0, 100) as string,
                  20,
                )}
              </Badge>
              {c.user_full_name && (
                <Badge
                  className="absolute left-0 top-0 m-4 border-transparent"
                  variant="default"
                >
                  {c.user_full_name}
                </Badge>
              )}
            </Link>
          </div>
        ))}
      </div>
    </Container>
  );
}
