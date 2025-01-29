import { list } from "@vercel/blob";
import mime from "mime-types";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cette route sert les fichiers d’un dossier (prefix) stocké dans Vercel Blob.
 *   - /blob/:prefix/     => renvoie index.html (si existe)
 *   - /blob/:prefix/:slug... => renvoie le fichier correspondant, sinon fallback index.html
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ prefix: string; slug?: string[] }> },
) {
  // Récupérer le hostname de la requête
  const hostname = request.headers.get("host");
  const pathname = new URL(request.url).pathname;

  let prefix: string;
  let slug: string[] = [];

  if (hostname?.includes("tailwindai.dev")) {
    // Format: prefix.tailwindai.dev/slug
    prefix = hostname.split(".")[0];
    // Récupère le slug depuis le pathname
    if (pathname !== "/") {
      // Enlève le premier slash et split le reste du chemin
      slug = pathname.slice(1).split("/");
    }
  } else {
    // Garder le comportement original pour les autres cas
    const params = await context.params;
    prefix = params.prefix;
    slug = params.slug || [];
  }

  // `prefix` = e7ff9bcc-7d89-401a-97a8-67cd5e13bf97-0
  // `slug`   = ["assets","main.js"] ou [] si rien

  // Construit le chemin complet dans Blob
  // Si on n'a pas de slug => on vise "index.html" par défaut
  const fileSubPath = slug.join("/");
  const filePath = fileSubPath
    ? `${prefix}/${fileSubPath}`
    : `${prefix}/index.html`;

  // On liste les blobs qui commencent par le prefix
  // pour filtrer un peu et ne pas tout charger
  const { blobs } = await list({ prefix: `${prefix}/` });
  // Exemple de pathname : "e7ff9bcc-7d89-401a-97a8-67cd5e13bf97-0/assets/main.js"

  // Recherche du fichier exact
  let matchedBlob = blobs.find((b) => b.pathname === filePath);

  // --- Fallback SPA ---
  // Si on n'a rien trouvé, on retente "index.html" pour gérer un routing client-side
  // (ex: /blob/:prefix/dashboard => renvoie quand même index.html)
  if (!matchedBlob) {
    const fallbackPath = `${prefix}/index.html`;
    matchedBlob = blobs.find((b) => b.pathname === fallbackPath);
    if (!matchedBlob) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  // On récupère l'URL publique du blob et on "re-télécharge" son contenu
  const blobResp = await fetch(matchedBlob.url);
  if (!blobResp.ok) {
    return new NextResponse("Erreur de fetch sur le blob", { status: 500 });
  }

  const data = await blobResp.arrayBuffer();

  // Détermine le type MIME depuis l'extension
  // (ou matchedBlob.contentType si tu l'as renseigné à l'upload)
  const extension = "." + (filePath.split(".").pop() ?? "");
  const mimeType = mime.lookup(extension) || "application/octet-stream";

  // Renvoie le fichier avec "inline" pour ne pas forcer le download
  // Si la requête n'a pas de slug du tout ( = /blob/<prefix> ) et ne finit pas par un slash
  console.log("request.url", request.url);
  if ((!slug || slug.length === 0) && !request.url.endsWith("/")) {
    // Redirige vers la même URL + "/"
    //return NextResponse.redirect(request.url + "/", 308);
  }
  return new NextResponse(data, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": "inline",
    },
  });
}
