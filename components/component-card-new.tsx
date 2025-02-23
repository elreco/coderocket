"use client";
import { SiHtml5 } from "@icons-pack/react-simple-icons";
import { SiVuedotjs } from "@icons-pack/react-simple-icons";
import { SiReact } from "@icons-pack/react-simple-icons";
import Image from "next/image";

import { GetComponentsReturnType } from "@/app/(default)/components/actions";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";

export function ComponentCardNew({
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
    <div className="group/card w-full">
      <div
        className={cn(
          " cursor-pointer overflow-hidden relative card h-96 rounded-md shadow-xl  max-w-sm mx-auto backgroundImage flex flex-col justify-between p-4",
          "bg-center bg-cover",
        )}
        style={{
          backgroundImage: `url(${
            chat.last_assistant_message ||
            "https://www.tailwindai.dev/placeholder.svg"
          })`,
        }}
      >
        <div className="absolute left-0 top-0 size-full opacity-60 transition duration-300 group-hover/card:bg-black"></div>
        <div className="z-10 flex flex-row items-center space-x-4">
          <Image
            height="100"
            width="100"
            alt="Avatar"
            src="/manu.png"
            className="size-10 rounded-full border-2 object-cover"
          />
          <div className="flex flex-col">
            <p className="relative z-10 text-base font-normal text-gray-50">
              Manu Arora
            </p>
            <p className="text-sm text-gray-400">2 min read</p>
          </div>
        </div>
        <div>
          <h1 className="relative z-10 line-clamp-2 max-w-full whitespace-pre-wrap text-xl font-bold text-gray-50 md:text-2xl">
            {chat.title || chat.first_user_message}
          </h1>
          <p className="relative z-10 my-4 text-sm font-normal text-gray-50">
            Card with Author avatar, complete name and time to read - most
            suitable for blogs.
          </p>
        </div>
      </div>
    </div>
  );
}
