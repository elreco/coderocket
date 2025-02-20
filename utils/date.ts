import { formatDistanceToNow } from "date-fns";

export const getRelativeDate = (date: string) => {
  let correctedDate = date
    .replace(/(\.\d{3})\d+/, "$1") // Tronque les millisecondes à 3 chiffres
    .replace(/\+00:00$/, "Z"); // Remplace +00:00 par Z

  // Si la date ne contient ni Z ni +00:00, on ajoute 'Z' pour forcer UTC
  if (!correctedDate.endsWith("Z") && !correctedDate.includes("+")) {
    correctedDate += "Z";
  }

  const newDate = new Date(correctedDate);

  if (isNaN(newDate.getTime())) {
    console.error("Date invalide:", date);
    return "Date invalide";
  }

  return formatDistanceToNow(newDate, { addSuffix: true });
};

export function formatToTimestamp(date: Date) {
  const isoString = date.toISOString(); // Format: "2024-08-31T09:49:06.024Z"
  const [datePart, timePart] = isoString.split("T"); // Sépare la date et l'heure
  const [time, millis] = timePart.split("."); // Sépare les millisecondes
  return `${datePart} ${time}.${millis.slice(0, 6)}+00`; // Ajoute le fuseau horaire
}
