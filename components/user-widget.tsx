import { cn } from "@/lib/utils";
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
    <div className="flex w-full items-center space-x-4">
      {userFullName && (
        <div className="flex flex-1 items-center space-x-2">
          <Avatar>
            <AvatarImage src={userAvatarUrl} />
            <AvatarFallback>{getInitials(userFullName)}</AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium">{userFullName}</p>
        </div>
      )}
      <p
        className={cn(
          "text-xs font-semibold text-primary whitespace-nowrap",
          userFullName ? "" : "ml-auto",
        )}
      >
        {getRelativeDate(createdAt)}
      </p>
    </div>
  );
}
