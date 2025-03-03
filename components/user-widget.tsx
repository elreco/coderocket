import { getRelativeDate } from "@/utils/date";
import { getInitials } from "@/utils/helpers";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function UserWidget({
  createdAt,
  userAvatarUrl,
  userFullName,
}: {
  createdAt: string;
  userAvatarUrl: string;
  userFullName: string;
}) {
  return (
    <div className="flex w-full items-center justify-start">
      <div className="flex items-center space-x-2">
        <Avatar>
          <AvatarImage src={userAvatarUrl || undefined} />
          <AvatarFallback className="bg-background">
            {userFullName ? getInitials(userFullName) : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col justify-center">
          <p className="text-base font-semibold">
            {userFullName || "Anonymous user"}
          </p>
          <p className="whitespace-nowrap text-xs font-medium">
            {getRelativeDate(createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
