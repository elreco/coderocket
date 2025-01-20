import { SiHtml5, SiReact } from "@icons-pack/react-simple-icons";
import { Paintbrush, TerminalIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { UserWidget } from "./user-widget";

type GetComponentsReturnType = {
  chat_id: string;
  user_id: string;
  framework: string;
  user_full_name: string;
  user_avatar_url: string;
  is_featured: boolean;
  is_private: boolean;
  created_at: string;
  first_user_message: string;
  last_assistant_message: string;
  last_assistant_message_theme: string;
  slug: string;
};

export default function ComponentCard({
  chat,
}: {
  chat: GetComponentsReturnType;
}) {
  const FrameworkIcon =
    chat.framework.toLowerCase() === "react" ? SiReact : SiHtml5;

  return (
    <Link
      key={chat.chat_id}
      href={`/components/${chat.slug || chat.chat_id}`}
      className="group flex flex-col rounded-lg border transition-all duration-300 hover:border-primary hover:shadow-2xl hover:shadow-primary/35"
    >
      <div className="relative flex overflow-hidden text-clip rounded-t-lg">
        <div className="relative aspect-video size-full transition duration-300 md:group-hover:scale-110">
          <img
            src={
              chat.last_assistant_message ||
              "https://www.tailwindai.dev/placeholder.svg"
            }
            className="size-full scale-105 object-cover"
            alt={
              chat.last_assistant_message ||
              "Placeholder image for the component"
            }
          />
        </div>
      </div>

      <div className="flex flex-col items-start rounded-b-lg border-t bg-secondary px-2 pb-2 pt-1.5 transition-all duration-300 group-hover:border-t-primary">
        <div className="mb-1 flex w-full items-center truncate pt-4 text-left text-sm font-medium transition-all duration-300 first-letter:uppercase group-hover:text-primary md:mb-2 md:pt-4 lg:pt-0 lg:text-base">
          <TerminalIcon className="mr-1.5 size-5 shrink-0 font-semibold" />
          <span className="truncate first-letter:uppercase">
            {chat.first_user_message}
          </span>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex flex-col items-start justify-start gap-2">
            {chat.framework === "html" && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge className="hover:bg-primary">
                    <Paintbrush className="mr-1 size-3" />
                    <span className="first-letter:uppercase">
                      {chat.last_assistant_message_theme}
                    </span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Theme</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger>
                <Badge className="hover:bg-primary">
                  <FrameworkIcon className="mr-1 size-3" />
                  <span className="first-letter:uppercase">
                    {chat.framework}
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Framework</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <UserWidget
            createdAt={chat.created_at}
            userAvatarUrl={chat.user_avatar_url}
            userFullName={chat.user_full_name}
          />
        </div>
      </div>
    </Link>
  );
}
