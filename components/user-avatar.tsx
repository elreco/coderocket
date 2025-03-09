import { avatarApi } from "@/utils/config";

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
      <Avatar className="mr-2 size-10 border border-primary">
        <AvatarImage src={avatarUrl || undefined} alt={fullName || undefined} />
        <AvatarFallback>
          <img
            src={`${avatarApi}${fullName}`}
            alt="logo"
            className="size-full"
          />
        </AvatarFallback>
      </Avatar>
      {fullName && <h2 className="text-lg font-semibold">{fullName}</h2>}
    </div>
  );
}
