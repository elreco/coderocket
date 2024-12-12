import { getInitials } from "@/lib/utils";
import { getRelativeDate } from "@/utils/date";

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
    <div className="flex items-center space-x-2">
      <p className="text-sm text-muted-foreground">
        {getRelativeDate(createdAt)}
        {userFullName && ` by `}
      </p>
      {userFullName && (
        <div className="ml-2 flex items-center space-x-2">
          <Avatar>
            <AvatarImage src={userAvatarUrl} />
            <AvatarFallback>{getInitials(userFullName)}</AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium">{userFullName}</p>
        </div>
      )}
    </div>
  );
}
