import { Database } from "@/types_db";

type Price = Database["public"]["Tables"]["prices"]["Row"];

export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    "https://www.coderocket.app";
  // Make sure to include `https://` when not localhost.
  url = url.includes("http") ? url : `https://${url}`;
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}`;
  return url;
};

export const postData = async ({
  url,
  data,
}: {
  url: string;
  data?: { price: Price } | { quantity: number };
}) => {
  console.log("posting,", url, data);

  const res = await fetch(url, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
    credentials: "same-origin",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    console.log("Error in postData", { url, data, res });

    throw Error(res.statusText);
  }
  return res.json();
};

export const toDateTime = (secs: number) => {
  const t = new Date("1970-01-01T00:30:00Z");
  t.setSeconds(secs);
  return t;
};

// Fonction pour normaliser un email (supprime les points et tout après + dans Gmail)
export function normalizeEmail(email: string): string {
  if (!email) return "";

  const [localPart, domain] = email.toLowerCase().split("@");

  // Pour les emails Gmail, Google ignore les points et tout ce qui suit +
  if (domain === "gmail.com" || domain === "googlemail.com") {
    // Supprimer les points et tout ce qui suit un +
    const normalizedLocal = localPart.replace(/\./g, "").split("+")[0];
    return `${normalizedLocal}@${domain}`;
  }

  return email.toLowerCase();
}

// Liste des domaines d'emails temporaires courants
export function isTemporaryEmailDomain(email: string): boolean {
  const temporaryDomains = [
    "mailinator.com",
    "temp-mail.org",
    "guerrillamail.com",
    "sharklasers.com",
    "yopmail.com",
    "10minutemail.com",
    "tempmail.com",
    "temp-mail.ru",
    "dispostable.com",
    "mailnesia.com",
    "mailinator.net",
    "trashmail.com",
    "wegwerfmail.de",
    "fakeinbox.com",
    "tempinbox.com",
    "mintemail.com",
    "throwawaymail.com",
    "spambox.us",
    "getairmail.com",
    "spamgourmet.com",
    "mailcatch.com",
    "tempemail.net",
    "tempmail.net",
    "spambog.com",
    "mytrashmail.com",
    "anonbox.net",
    "kasmail.com",
    "spammotel.com",
    "mailforspam.com",
    "tempmail.it",
    "getnada.com",
    "emailondeck.com",
    "mohmal.com",
    "tempr.email",
  ];

  if (!email) return false;

  const domain = email.split("@")[1].toLowerCase();
  return temporaryDomains.includes(domain);
}

export const capitalizeFirstLetter = (string: string, maxLength?: number) => {
  if (!string) return "";
  let formattedString =
    string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  if (maxLength && formattedString.length > maxLength) {
    formattedString = formattedString.substring(0, maxLength) + "...";
  }
  return formattedString;
};

export function getInitials(name: string) {
  if (!name || typeof name !== "string") {
    return "";
  }

  const words = name.trim().split(/\s+/);

  const initials = words.map((word) => word[0].toUpperCase()).join("");

  return initials;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
