import { formatDistanceToNow } from "date-fns";

export const getRelativeDate = (date: string) => {
  const newDate = new Date(date);
  return formatDistanceToNow(newDate, { addSuffix: true });
};

export function formatToTimestamp(date: Date) {
  const isoString = date.toISOString(); // Format: "2024-08-31T09:49:06.024Z"
  const [datePart, timePart] = isoString.split("T"); // Sépare la date et l'heure
  const [time, millis] = timePart.split("."); // Sépare les millisecondes
  return `${datePart} ${time}.${millis.slice(0, 6)}+00`; // Ajoute le fuseau horaire
}
