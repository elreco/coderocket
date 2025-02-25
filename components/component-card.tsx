"use client";
import { SiHtml5 } from "@icons-pack/react-simple-icons";
import { SiVuedotjs } from "@icons-pack/react-simple-icons";
import { SiReact } from "@icons-pack/react-simple-icons";
import { StarIcon } from "lucide-react";
import Link from "next/link";

import { GetComponentsReturnType } from "@/app/(default)/components/actions";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";

import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { UserWidget } from "./user-widget";

export default function ComponentCard({
  chat,
  isPopular,
}: {
  chat: GetComponentsReturnType;
  isPopular?: boolean;
}) {
  const FrameworkIcon =
    chat.framework === Framework.REACT
      ? SiReact
      : chat.framework === Framework.VUE
        ? SiVuedotjs
        : SiHtml5;
  return (
    <Link
      key={chat.chat_id}
      href={`/components/${chat.slug || chat.chat_id}`}
      className="group/card w-full"
    >
      <div
        className={cn(
          "w-full cursor-pointer overflow-hidden relative transition duration-300 card h-72 rounded-md hover:shadow-2xl mx-auto backgroundImage flex flex-col justify-between p-4",
          "bg-center bg-cover",
          isPopular
            ? "hover:border-amber-600 hover:shadow-amber-500/35"
            : "hover:border-primary hover:shadow-primary/35",
        )}
        style={{
          backgroundImage: `url(${
            chat.last_assistant_message ||
            "https://www.tailwindai.dev/placeholder.svg"
          })`,
          backgroundSize: "100%",
          transition: "background-size 0.3s ease-in-out",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundSize = "110%";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundSize = "100%";
        }}
      >
        <div className="absolute left-0 top-0 size-full bg-gradient-to-b from-black/35 via-black/15 to-black/35 transition duration-300 group-hover/card:opacity-0"></div>
        <div className="z-10 flex flex-row items-center space-x-4 opacity-100 transition-all duration-300 group-hover/card:-translate-y-full  group-hover/card:opacity-0">
          <UserWidget
            createdAt={chat.created_at}
            userAvatarUrl={chat.user_avatar_url}
            userFullName={chat.user_full_name}
          />
        </div>
        <div className="opacity-100 transition-all duration-300 group-hover/card:translate-y-full group-hover/card:opacity-0">
          <h1 className="relative z-10 line-clamp-2 max-w-full whitespace-pre-wrap text-lg font-bold text-gray-50 md:text-xl">
            {chat.title || chat.first_user_message}
          </h1>
          <div className="relative z-10 mt-2 flex flex-row items-center justify-between">
            {isPopular && (
              <div className="flex items-start justify-start gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                      <StarIcon className="mr-1 size-3" />
                      <span className="first-letter:uppercase">Popular</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="bg-amber-500 text-white">
                    <p>{chat.likes} likes</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
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
          </div>
        </div>
      </div>
    </Link>
  );
}
