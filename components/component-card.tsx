"use client";
import { SiHtml5 } from "@icons-pack/react-simple-icons";
import { SiVuedotjs } from "@icons-pack/react-simple-icons";
import { SiReact } from "@icons-pack/react-simple-icons";
import { GitFork, Heart, Eye } from "lucide-react";
import Link from "next/link";

import { GetComponentsReturnType } from "@/app/(default)/components/actions";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";

import { Badge } from "./ui/badge";

interface ComponentCardProps {
  chat: GetComponentsReturnType;
  isReverse?: boolean;
}

export function ComponentCard({ chat, isReverse }: ComponentCardProps) {
  const FrameworkIcon =
    chat.framework === Framework.REACT
      ? SiReact
      : chat.framework === Framework.VUE
        ? SiVuedotjs
        : SiHtml5;

  return (
    <Link
      href={`/components/${chat.slug || chat.chat_id}`}
      className="group/card flex size-full"
    >
      <div
        key={chat.chat_id}
        className={cn(
          "w-full bg-center overflow-hidden relative card rounded-md mx-auto",
          isReverse ? "bg-background" : "bg-secondary",
        )}
      >
        {/* Image */}
        <div
          className="group relative h-56 w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${
              chat.last_assistant_message ||
              "https://www.tailwindai.dev/placeholder.svg"
            })`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100">
            <Eye className="size-8 translate-y-4 text-white transition-transform duration-300 ease-in-out group-hover:translate-y-0" />
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(100%-14rem)] flex-col justify-between p-4">
          {/* Title and Author */}
          <div className="flex flex-col gap-2">
            <h1 className="line-clamp-2 max-w-full whitespace-pre-wrap text-sm font-medium text-foreground">
              {chat.title || chat.first_user_message}
            </h1>
            <span className="text-xs text-muted-foreground">
              {chat.user_full_name || "Anonymous user"}
            </span>
          </div>

          {/* Framework Badge and Stats */}
          <div className="mt-5 flex items-center justify-between">
            <Badge className="hover:bg-primary">
              <FrameworkIcon className="mr-1 size-3" />
              <span className="first-letter:uppercase">{chat.framework}</span>
            </Badge>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Heart className="size-3.5" />
                <span>{chat.likes || 0}</span>
              </div>
              {chat.remix_chat_id && (
                <div className="flex items-center gap-1">
                  <GitFork className="size-3" />
                  <span>Remixed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
