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
    <div className="flex w-full items-center justify-end">
      <div className="ml-auto flex items-center space-x-2">
        <div className="flex flex-col">
          <p className="text-right text-sm font-medium">
            {userFullName || "Anonymous user"}
          </p>
          <p className="whitespace-nowrap text-right text-xs font-semibold text-primary">
            {getRelativeDate(createdAt)}
          </p>
        </div>
        <Avatar>
          <AvatarImage src={userAvatarUrl || undefined} />
          <AvatarFallback className="bg-background">
            {userFullName ? getInitials(userFullName) : "?"}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
