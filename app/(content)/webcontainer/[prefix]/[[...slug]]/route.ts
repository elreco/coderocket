import { list } from "@vercel/blob";
import mime from "mime-types";
import { NextRequest, NextResponse } from "next/server";
export const revalidate = 0;
/**
 * Cette route sert les fichiers d’un dossier (prefix) stocké dans Vercel Blob.
 *   - /blob/:prefix/             => renvoie index.html (si existe)

 *   - /blob/:prefix/:slug...     => renvoie le fichier correspondant
 *   - Fallback SPA sur index.html si aucun fichier trouvé OU slug sans extension (routing client)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ prefix: string; slug?: string[] }> },
) {
  console.log("API Route: Reçu requête pour", request.url);

  // 1. Déterminer le prefix et le slug depuis l’URL
  const hostname = request.headers.get("host");
  const { pathname } = new URL(request.url);

  let prefix: string;
  let slug: string[] = [];

  if (hostname?.includes("tailwindai.dev")) {
    // Format : prefix.tailwindai.dev/slug...
    prefix = hostname.split(".")[0]; // Ex: e7ff9bcc-7d89-401a-97a8-67cd5e13bf97-0
    if (pathname !== "/") {
      slug = pathname.slice(1).split("/");
    }
  } else {
    // Cas normal /blob/:prefix/:slug...
    const params = await context.params;
    prefix = params.prefix;
    slug = params.slug || [];
  }

  console.log("API Route: Prefix =", prefix, "| Slug =", slug);

  // 2. Construit le chemin complet dans le storage
  const fileSubPath = slug.join("/");
  const filePath = fileSubPath
    ? `${prefix}/${fileSubPath}`
    : `${prefix}/index.html`;

  console.log("API Route: Recherche fichier", filePath);

  // 3. Liste les blobs commençant par le prefix
  const { blobs } = await list({ prefix: `${prefix}/` });

  // 4. Recherche du fichier exact
  let matchedBlob = blobs.find((b) => b.pathname === filePath);

  // 5. Forcer le fallback si le slug n’a pas d’extension
  const lastSegment = slug[slug.length - 1];
  const hasExtension = lastSegment?.includes(".");

  // Avoid fallback for JavaScript module requests
  if (slug.length > 0 && !hasExtension && !lastSegment?.endsWith(".js")) {
    console.log(
      "API Route: Slug sans extension, fallback forcé vers index.html",
    );
    matchedBlob = undefined;
  }

  // 6. Fallback SPA : si le fichier n’existe pas OU slug sans extension
  if (!matchedBlob) {
    const fallbackPath = `${prefix}/index.html`;
    matchedBlob = blobs.find((b) => b.pathname === fallbackPath);

    if (!matchedBlob) {
      console.log("API Route: index.html non trouvé, retour 404");
      return new NextResponse("Not found", { status: 404 });
    }
  }

  console.log("API Route: Fichier trouvé", matchedBlob.pathname);

  // 7. Récupère le contenu du Blob et le renvoie
  const blobResp = await fetch(matchedBlob.url);
  if (!blobResp.ok) {
    console.log(
      "API Route: Erreur lors de la récupération du blob",
      blobResp.status,
    );
    return new NextResponse("Erreur de fetch sur le blob", { status: 500 });
  }

  const data = await blobResp.arrayBuffer();

  // 8. Détermine le type MIME
  let mimeType: string;
  if (matchedBlob.pathname.endsWith("index.html")) {
    mimeType = "text/html"; // 👈 Assure que index.html est servi correctement
  } else if (matchedBlob.pathname.endsWith(".js")) {
    mimeType = "application/javascript"; // 👈 Correct MIME type for JavaScript
  } else {
    const extension = "." + (filePath.split(".").pop() ?? "");
    mimeType = mime.lookup(extension) || "application/octet-stream";
  }

  console.log("API Route: Servant fichier avec Content-Type", mimeType);

  return new NextResponse(data, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",

      // 🔥 Désactive toutes les restrictions cross-origin
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",

      // 🔥 Autorise l'iframe sans restriction
      "X-Frame-Options": "ALLOWALL",
      "Content-Security-Policy": "frame-ancestors *",

      // 🔥 Désactive COEP et COOP
      "Cross-Origin-Embedder-Policy": "unsafe-none",
      "Cross-Origin-Opener-Policy": "unsafe-none",
    },
  });
}
