import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { capitalizeFirstLetter } from "@/utils/helpers";

import { getFeaturedChats } from "./actions";

export default async function Featured() {
  const chats = await getFeaturedChats();
  return (
    <Container>
      <h1 className="mb-1 text-lg font-medium text-gray-900 sm:text-left sm:text-2xl">
        Featured Components
      </h1>
      <h2 className="mb-8 text-lg text-gray-700 sm:text-left sm:text-xl">
        Handpicked components for your projects
      </h2>
      <div className="grid grid-cols-1 gap-3 pb-20 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {chats?.map((c) => (
          <div key={c.chat_id} className="relative aspect-video w-full">
            <Image
              src={c.image_url}
              fill
              className="w-full rounded-md border object-cover shadow-md"
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
