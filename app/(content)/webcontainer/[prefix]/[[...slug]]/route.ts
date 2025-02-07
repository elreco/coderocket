import { list } from "@vercel/blob";
import mime from "mime-types";
import { NextRequest, NextResponse } from "next/server";

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
  // 1. Déterminer le prefix et le slug depuis l’URL
  const hostname = request.headers.get("host");
  const { pathname } = new URL(request.url);

  let prefix: string;
  let slug: string[] = [];

  if (hostname?.includes("tailwindai.dev")) {
    // Format : prefix.tailwindai.dev/slug...
    prefix = hostname.split(".")[0]; // Ex: e7ff9bcc-7d89-401a-97a8-67cd5e13bf97-0
    if (pathname !== "/") {
      // Enlève le "/" initial et split : "/dashboard" => ["dashboard"]
      slug = pathname.slice(1).split("/");
    }
  } else {
    // Cas normal /blob/:prefix/:slug...
    const params = await context.params;
    prefix = params.prefix;
    slug = params.slug || [];
  }

  // 2. Construit le chemin complet dans le storage
  //    Si on n'a pas de slug => index.html
  const fileSubPath = slug.join("/");
  const filePath = fileSubPath
    ? `${prefix}/${fileSubPath}`
    : `${prefix}/index.html`;

  // 3. Liste les blobs commençant par le prefix
  const { blobs } = await list({ prefix: `${prefix}/` });

  // 4. Recherche du fichier exact
  let matchedBlob = blobs.find((b) => b.pathname === filePath);

  // 5. Forcer le fallback si le slug n’a pas d’extension
  //    => Cas typique d’une route client-side ex: /dashboard, /profile, etc.
  const lastSegment = slug[slug.length - 1];
  const hasExtension = lastSegment?.includes(".");

  // Si on a un slug (exclure la page d’accueil) et aucune extension => Fallback
  if (slug.length > 0 && !hasExtension) {
    matchedBlob = undefined;
  }

  // 6. Fallback SPA : si le fichier n’existe pas OU slug sans extension
  if (!matchedBlob) {
    const fallbackPath = `${prefix}/index.html`;
    matchedBlob = blobs.find((b) => b.pathname === fallbackPath);

    // Si on n’a pas d’index.html non plus => 404
    if (!matchedBlob) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  // 7. Récupère le contenu du Blob et le renvoie
  const blobResp = await fetch(matchedBlob.url);
  if (!blobResp.ok) {
    return new NextResponse("Erreur de fetch sur le blob", { status: 500 });
  }

  const data = await blobResp.arrayBuffer();

  // 8. Détermine le type MIME
  const extension = "." + (filePath.split(".").pop() ?? "");
  const mimeType = mime.lookup(extension) || "application/octet-stream";

  return new NextResponse(data, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": "inline",
    },
  });
}
