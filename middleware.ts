import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const hostname = request.headers.get("host");

  if (hostname === "tailwindai.dev" || hostname?.endsWith(".tailwindai.dev")) {
    const url = request.nextUrl.clone();
    url.host = "coderocket.app";
    return NextResponse.redirect(url, 301);
  }

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

  if (
    hostname?.endsWith(".coderocket.app") &&
    hostname !== "www.coderocket.app" &&
    hostname !== "coderocket.app" &&
    !hostname.includes("preview.coderocket.app") &&
    !hostname.includes("webcontainer.coderocket.app")
  ) {
    const subdomain = hostname.replace(".coderocket.app", "");
    const pathname = request.nextUrl.pathname;
    const newUrl = new URL(
      `/api/deploy/${subdomain}${pathname}`,
      request.nextUrl,
    );
    return NextResponse.rewrite(newUrl, response);
  }

  return response;
}

// Applique le middleware sur toutes les routes sauf fichiers système Next.js
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
