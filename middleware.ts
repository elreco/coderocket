import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Mise à jour de la session Supabase
  const response = await updateSession(request);

  // Récupération du host pour gérer les redirections
  const hostname = request.headers.get("host");

  // 🔁 Redirection 301 de tailwindai.dev vers coderocket.app
  if (hostname === "tailwindai.dev" || hostname?.endsWith(".tailwindai.dev")) {
    const url = request.nextUrl.clone();
    url.host = "coderocket.app";
    return NextResponse.redirect(url, 301);
  }

  // 🔁 Réécriture pour les sous-domaines spécifiques
  const subdomainConfig = {
    "preview.coderocket.app": "preview",
    "webcontainer.coderocket.app": "webcontainer",
  } as const;

  for (const [domain, path] of Object.entries(subdomainConfig)) {
    if (hostname?.endsWith(`.${domain}`)) {
      const prefix = hostname.split(".")[0];
      const pathname = request.nextUrl.pathname;
      const newUrl = new URL(`/${path}/${prefix}${pathname}`, request.nextUrl);
      return NextResponse.rewrite(newUrl, response);
    }
  }

  // Pas de redirection ni de réécriture → continue normalement
  return response;
}

// Applique le middleware sur toutes les routes sauf fichiers système Next.js
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
