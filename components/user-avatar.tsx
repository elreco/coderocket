import { getInitials } from "@/utils/helpers";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function UserAvatar({
  avatarUrl,
  fullName,
}: {
  avatarUrl?: string | null;
  fullName?: string | null;
}) {
  return (
    <div className="flex items-center">
      <Avatar className="mr-2 size-10">
        <AvatarImage src={avatarUrl || undefined} alt={fullName || undefined} />
        <AvatarFallback className="bg-background">
          <span className="text-xs">{getInitials(fullName || "")}</span>
        </AvatarFallback>
      </Avatar>
      {fullName && <h2 className="text-lg font-semibold">{fullName}</h2>}
    </div>
  );
}
