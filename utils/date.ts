import { formatDistanceToNow } from "date-fns";

export const getRelativeDate = (date: Date) => {
  const newDate = new Date(date);
  return formatDistanceToNow(newDate, { addSuffix: true });
};
