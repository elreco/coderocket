import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Mise à jour de la session Supabase
  const response = await updateSession(request);

  // Récupération du host pour gérer les sous-domaines
  const hostname = request.headers.get("host");

  // Vérifie si on est dans un contexte [prefix].dev.tailwindai.dev
  if (hostname?.endsWith(".dev.tailwindai.dev")) {
    const prefix = hostname.split(".")[0]; // Extrait le "prefix"
    const pathname = request.nextUrl.pathname; // Récupère le chemin

    // Réécrit la requête en interne vers /webcontainer/[prefix]/[[...slug]]
    const newUrl = new URL(
      `/webcontainer/${prefix}${pathname}`,
      request.nextUrl,
    );

    return NextResponse.rewrite(newUrl, response);
  }

  return response; // Continue normalement si pas de sous-domaine concerné
}

// Applique le middleware sur toutes les routes sauf les fichiers système Next.js
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
