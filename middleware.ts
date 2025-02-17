import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Mise à jour de la session Supabase
  const response = await updateSession(request);

  // Récupération du host pour gérer les sous-domaines
  const hostname = request.headers.get("host");

  // Configuration des sous-domaines et leurs redirections
  const subdomainConfig = {
    "preview.tailwindai.dev": "preview",
    "webcontainer.tailwindai.dev": "webcontainer",
  } as const;

  // Vérifie si on est dans un contexte de sous-domaine
  for (const [domain, path] of Object.entries(subdomainConfig)) {
    if (hostname?.endsWith(`.${domain}`)) {
      const prefix = hostname.split(".")[0];
      const pathname = request.nextUrl.pathname;
      const newUrl = new URL(`/${path}/${prefix}${pathname}`, request.nextUrl);

      return NextResponse.rewrite(newUrl, response);
    }
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
