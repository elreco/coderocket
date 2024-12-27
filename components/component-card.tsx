import Link from "next/link";

import RenderHtmlComponent from "@/app/(content)/render-html-component";
import { handleAIcompletionForHTML } from "@/utils/completion-parser";
import { capitalizeFirstLetter } from "@/utils/helpers";

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
  last_assistant_message_content: string;
  last_assistant_message_theme: string;
};

export default function ComponentCard({
  chat,
}: {
  chat: GetComponentsReturnType;
}) {
  const files = handleAIcompletionForHTML(
    chat.last_assistant_message_content,
    chat.last_assistant_message_theme,
  );
  return (
    <Link
      key={chat.chat_id}
      href={`/components/${chat.chat_id}`}
      className="group flex flex-col"
    >
      <div className="mb-2 flex text-clip rounded-xl">
        <div className="relative aspect-video size-full transition duration-300 md:group-hover:scale-105">
          <div className="relative h-0 w-full overflow-hidden rounded-md pt-[56.25%]">
            <div className="pointer-events-none absolute left-0 top-0 size-full overflow-hidden rounded-md">
              <RenderHtmlComponent
                style={{
                  width: "1920px",
                  height: "1080px",
                  border: "none",
                  transform: "translateX(-50%) scale(0.3)",
                  transformOrigin: "top center",
                  pointerEvents: "none",
                  position: "absolute",
                  top: "0",
                  left: "50%",
                }}
                files={files}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mb-1 line-clamp-3 break-words pt-4 text-sm font-medium md:mb-1 md:pt-4 lg:pt-2 lg:text-base">
        {capitalizeFirstLetter(chat.first_user_message, 40)}
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
