import { NextRequest } from "next/server";

/**
 * Récupère l'adresse IP du client à partir des en-têtes de la requête
 * Prend en compte les différents proxys (Cloudflare, Vercel, etc.)
 */
export function getClientIp(request: NextRequest | Request | Headers): string {
  let headers: Headers;

  if (request instanceof NextRequest || request instanceof Request) {
    headers = request.headers;
  } else {
    headers = request;
  }

  // Ordre de priorité pour la récupération de l'IP client
  const ipHeaders = [
    "cf-connecting-ip", // Cloudflare
    "x-real-ip", // Nginx
    "x-forwarded-for", // Commun pour la plupart des proxies
    "x-client-ip", // Apache
    "x-forwarded", // Standard
    "forwarded-for", // Standard
    "forwarded", // Standard
    "true-client-ip", // Akamai et Cloudflare
    "fastly-client-ip", // Fastly CDN
    "x-cluster-client-ip", // Rackspace Cloud
  ];

  // Parcourir les en-têtes par ordre de priorité
  for (const header of ipHeaders) {
    const value = headers.get(header);
    if (value) {
      // x-forwarded-for peut contenir plusieurs IP, prendre la première
      const ip = value.split(",")[0].trim();
      return ip;
    }
  }

  // Aucune IP trouvée dans les en-têtes
  return "";
}

/**
 * Vérifie si une IP est valide (IPv4 ou IPv6)
 */
export function isValidIp(ip: string): boolean {
  // Regex pour IPv4
  const ipv4Regex =
    /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;

  // Regex simplifiée pour IPv6
  const ipv6Regex = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
