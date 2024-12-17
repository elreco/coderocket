import { formatDistanceToNow } from "date-fns";

export const getRelativeDate = (date: string) => {
  const newDate = new Date(date);
  return formatDistanceToNow(newDate);
};
