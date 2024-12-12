import { getRelativeDate } from "@/utils/date";

export default function UserWidget({
  userFullName,
  createdAt,
}: {
  userFullName: string;
  createdAt: string;
}) {
  return (
    <p className="mb-1">{userFullName}</p>
        <p className="text-sm font-medium text-muted-foreground">
          {getRelativeDate(createdAt)}
          {userFullName && ` by ${userFullName}`}
        </p>
  );
}
