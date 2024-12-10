import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string) {
  if (!name || typeof name !== "string") {
    return "";
  }

  const words = name.trim().split(/\s+/);

  const initials = words.map((word) => word[0].toUpperCase()).join("");

  return initials;
}

export const sanitizePrompt = (prompt: string): string => {
  // Retire les balises HTML
  return prompt.replace(/<[^>]*>/g, "");
};

export const isValidPrompt = (prompt: string): boolean => {
  // Autorise uniquement les lettres, chiffres, espaces et certains caractères de ponctuation
  const regex = /^[a-zA-Z0-9\s.,?!'-]+$/;
  return regex.test(prompt);
};
