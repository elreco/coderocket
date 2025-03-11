"use client";
import { SiHtml5 } from "@icons-pack/react-simple-icons";
import { SiVuedotjs } from "@icons-pack/react-simple-icons";
import { SiReact } from "@icons-pack/react-simple-icons";
import { ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { GetComponentsReturnType } from "@/app/(default)/components/actions";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";

import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { UserWidget } from "./user-widget";

export function ComponentCard({
  chat,
  isPopular,
}: {
  chat: GetComponentsReturnType;
  isPopular?: boolean;
}) {
  const router = useRouter();
  const FrameworkIcon =
    chat.framework === Framework.REACT
      ? SiReact
      : chat.framework === Framework.VUE
        ? SiVuedotjs
        : SiHtml5;

  const handleUserClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/users/${chat.user_id}`);
  };

  return (
    <Link
      href={`/components/${chat.slug || chat.chat_id}`}
      className="group/card flex size-full"
    >
      <div
        key={chat.chat_id}
        className={cn(
          "w-full bg-center size-full overflow-hidden bg-cover bg-no-repeat relative transition-all duration-300 card min-h-72 rounded-[6px] hover:shadow-2xl mx-auto backgroundImage flex flex-col justify-between p-4 border border-background",
          isPopular
            ? "hover:border-amber-600 hover:shadow-amber-500/35"
            : "hover:border-primary hover:shadow-primary/35",
        )}
        style={{
          backgroundImage: `url(${
            chat.last_assistant_message ||
            "https://www.tailwindai.dev/placeholder.svg"
          })`,
        }}
      >
        <div className="absolute inset-0 size-full bg-gradient-to-b from-background/40 via-background/10 to-background/40"></div>
        <div className="z-10 flex flex-row items-center space-x-4 text-foreground transition-all duration-300">
          <UserWidget
            id={chat.user_id}
            createdAt={chat.created_at}
            userAvatarUrl={chat.user_avatar_url}
            userFullName={chat.user_full_name}
            disableLink={true}
            onClick={handleUserClick}
          />
        </div>
        <div>
          <h1 className="relative z-10 line-clamp-2 max-w-full whitespace-pre-wrap text-lg font-bold text-foreground transition-all duration-300 md:text-xl">
            {chat.title || chat.first_user_message}
          </h1>
          <div className="relative z-10 mt-2 flex flex-row items-center justify-start space-x-2">
            <div className="flex items-start justify-start gap-2">
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
            {isPopular && (
              <div className="flex items-start justify-start gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    <Badge className="bg-amber-500 hover:bg-amber-500">
                      <ThumbsUp className="mr-1 size-3" />
                      <span className="first-letter:uppercase">Popular</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="bg-amber-500">
                    <p>{chat.likes} likes</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
