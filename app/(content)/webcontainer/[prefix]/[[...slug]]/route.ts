import { list } from "@vercel/blob";
import mime from "mime-types";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

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

  const hostname = request.headers.get("host");
  const pathname = request.nextUrl.pathname;

  let prefix: string;
  let slug: string[] = [];

  if (hostname?.includes("coderocket.app")) {
    prefix = hostname.split(".")[0];

    if (pathname.startsWith("/webcontainer/")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length > 1) {
        parts.shift();
        const nextPart = parts[0];
        if (nextPart === "_custom" || nextPart === prefix) {
          parts.shift();
        }
        slug = parts;
      }
    } else if (pathname !== "/") {
      slug = pathname.slice(1).split("/");
    }

    const isUuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+$/i.test(
        prefix,
      );

    if (!isUuidPattern) {
      const supabase = await createClient();
      const { data: chat, error } = await supabase
        .from("chats")
        .select("id, deployed_version")
        .eq("deploy_subdomain", prefix)
        .eq("is_deployed", true)
        .single();

      if (error || !chat || chat.deployed_version === null) {
        return new NextResponse(
          `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Not Found - CodeRocket</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 1rem;
                }
                .container {
                  text-align: center;
                  max-width: 600px;
                }
                h1 {
                  font-size: clamp(2rem, 5vw, 3rem);
                  margin-bottom: 1rem;
                }
                p {
                  font-size: clamp(1rem, 2.5vw, 1.2rem);
                  opacity: 0.9;
                  margin-bottom: 2rem;
                }
                a {
                  display: inline-block;
                  padding: 0.75rem 1.5rem;
                  background: white;
                  color: #667eea;
                  text-decoration: none;
                  border-radius: 0.5rem;
                  font-weight: 600;
                  transition: transform 0.2s;
                }
                a:hover {
                  transform: translateY(-2px);
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🚀 Not Found</h1>
                <p>This application is not deployed or doesn't exist.</p>
                <a href="https://www.coderocket.app">Go to CodeRocket</a>
              </div>
            </body>
          </html>
        `,
          {
            status: 404,
            headers: {
              "Content-Type": "text/html",
            },
          },
        );
      }

      prefix = `${chat.id}-${chat.deployed_version}`;
      console.log("API Route: Custom domain resolved to prefix =", prefix);
    }
  } else {
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

  // 5. Déterminer si c'est une route SPA (pas d'extension)
  const lastSegment = slug[slug.length - 1];
  const hasExtension = lastSegment?.includes(".");

  // 6. Fallback SPA : uniquement pour les routes sans extension
  if (!matchedBlob) {
    if (!hasExtension && slug.length > 0) {
      console.log(
        "API Route: Slug sans extension et fichier non trouvé, fallback vers index.html",
      );
      const fallbackPath = `${prefix}/index.html`;
      matchedBlob = blobs.find((b) => b.pathname === fallbackPath);

      if (!matchedBlob) {
        console.log("API Route: index.html non trouvé, retour 404");
        return new NextResponse("Not found", { status: 404 });
      }
    } else {
      console.log("API Route: Fichier avec extension non trouvé, retour 404");
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
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",

      // CORS (sans credentials + wildcard)
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",

      // Iframe autorisé
      "X-Frame-Options": "ALLOWALL",
      "Content-Security-Policy": "frame-ancestors *",
      "Cross-Origin-Isolation": "require-corp",
      // Cross-Origin Isolation (vous aviez déjà COEP: credentialless + COOP: same-origin)
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",

      // Manquant auparavant : indique qu’on accepte d’être chargé cross-origin
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
