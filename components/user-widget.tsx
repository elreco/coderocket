import Link from "next/link";

import { avatarApi } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function UserWidget({
  createdAt,
  userAvatarUrl,
  userFullName,
  id,
}: {
  createdAt: string;
  userAvatarUrl: string;
  userFullName: string;
  id: string;
}) {
  return (
    <Link
      href={`/users/${id}`}
      className="group flex w-full cursor-pointer items-center justify-start rounded-md p-2 transition-all duration-300 hover:bg-foreground/50 hover:backdrop-blur-sm"
    >
      <div className="flex items-center space-x-2">
        <Avatar className="border border-primary">
          <AvatarImage src={userAvatarUrl || undefined} />
          <AvatarFallback>
            <img
              src={`${avatarApi}${userFullName}`}
              alt="logo"
              className="size-full"
            />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col justify-center">
          <p className="text-base font-semibold transition-colors duration-300 group-hover:text-secondary">
            {userFullName || "Anonymous user"}
          </p>
          <p className="whitespace-nowrap text-xs font-medium transition-colors duration-300 group-hover:text-secondary">
            {getRelativeDate(createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
