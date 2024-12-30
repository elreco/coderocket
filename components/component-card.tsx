import Image from "next/image";
import Link from "next/link";

import { UserWidget } from "./user-widget";

type GetComponentsReturnType = {
  chat_id: string;
  user_id: string;
  user_full_name: string;
  user_avatar_url: string;
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
    <Link
      key={chat.chat_id}
      href={`/components/${chat.chat_id}`}
      className="group flex flex-col"
    >
      <div className="mb-2 flex overflow-hidden text-clip rounded-lg border transition-all duration-300 hover:border-primary/65 hover:shadow-2xl hover:shadow-primary/50">
        <div className="relative aspect-video size-full transition duration-300 md:group-hover:scale-110">
          <Image
            src={chat.last_assistant_message}
            fill
            sizes="600px"
            className="scale-105 object-cover"
            alt=""
          />
        </div>
      </div>
      <div className="mb-1 max-w-full truncate pt-4 text-sm font-medium first-letter:uppercase md:mb-1 md:pt-4 lg:pt-2 lg:text-base">
        {chat.first_user_message}
      </div>
      <div className="flex items-center gap-2">
        <UserWidget
          createdAt={chat.created_at}
          userAvatarUrl={chat.user_avatar_url}
          userFullName={chat.user_full_name}
        />
      </div>
    </Link>
  );
}
