import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";
import { createClient } from "@/utils/supabase/server";

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const INTERNAL_PATH_PREFIXES = ["/_next", "/webcontainer"];
const LOCAL_PREVIEW_PREFIX_COOKIE = "coderocket_local_preview_prefix";

async function checkCustomDomain(hostname: string) {
  try {
    const supabase = await createClient();

    const { data: customDomain } = await supabase
      .from("custom_domains")
      .select("chat_id, is_verified")
      .eq("domain", hostname)
      .eq("is_verified", true)
      .maybeSingle();

    if (customDomain) {
      const { data: chat } = await supabase
        .from("chats")
        .select("deploy_subdomain, is_deployed")
        .eq("id", customDomain.chat_id)
        .eq("is_deployed", true)
        .maybeSingle();

      if (chat?.deploy_subdomain) {
        return chat.deploy_subdomain;
      }
    }
  } catch (error) {
    console.error("Error checking custom domain:", error);
  }

  return null;
}

function isLocalHost(hostname: string | null): boolean {
  if (!hostname) {
    return false;
  }

  return LOCAL_HOSTS.some(
    (localHost) =>
      hostname === localHost || hostname.startsWith(`${localHost}:`),
  );
}

function extractLocalWebcontainerPrefix(request: NextRequest): string | null {
  const referer = request.headers.get("referer");
  if (!referer) {
    return null;
  }

  try {
    const refererUrl = new URL(referer);
    const requestHost = request.headers.get("host");

    if (!requestHost || refererUrl.host !== requestHost) {
      return null;
    }

    const parts = refererUrl.pathname.split("/").filter(Boolean);
    if (parts[0] !== "webcontainer" || !parts[1]) {
      return null;
    }

    return parts[1];
  } catch {
    return null;
  }
}

function looksLikeStaticAssetPath(pathname: string): boolean {
  if (pathname.startsWith("/assets/")) {
    return true;
  }

  const lastSegment = pathname.split("/").pop() || "";
  return lastSegment.includes(".") && !pathname.endsWith(".html");
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const hostname = request.headers.get("host");

  if (hostname === "tailwindai.dev" || hostname?.endsWith(".tailwindai.dev")) {
    const url = request.nextUrl.clone();
    url.host = "coderocket.app";
    return NextResponse.redirect(url, 301);
  }

  if (
    isLocalHost(hostname) &&
    !INTERNAL_PATH_PREFIXES.some((prefix) =>
      request.nextUrl.pathname.startsWith(prefix),
    )
  ) {
    const cookiePrefix = request.cookies.get(LOCAL_PREVIEW_PREFIX_COOKIE)?.value;
    if (cookiePrefix && looksLikeStaticAssetPath(request.nextUrl.pathname)) {
      const rewrittenUrl = request.nextUrl.clone();
      rewrittenUrl.pathname = `/webcontainer/${cookiePrefix}${request.nextUrl.pathname}`;
      return NextResponse.rewrite(rewrittenUrl, response);
    }

    const localPreviewPrefix = extractLocalWebcontainerPrefix(request);

    if (localPreviewPrefix) {
      const rewrittenUrl = request.nextUrl.clone();
      rewrittenUrl.pathname = `/webcontainer/${localPreviewPrefix}${request.nextUrl.pathname}`;
      return NextResponse.rewrite(rewrittenUrl, response);
    }
  }

  if (
    hostname &&
    !hostname.includes("coderocket.app") &&
    !hostname.includes("localhost") &&
    !hostname.includes("127.0.0.1")
  ) {
    const customSubdomain = await checkCustomDomain(hostname);

    if (customSubdomain) {
      const pathname = request.nextUrl.pathname;
      const newUrl = new URL(
        `/webcontainer/_custom${pathname}${request.nextUrl.search}`,
        request.nextUrl,
      );

      const customResponse = NextResponse.rewrite(newUrl, response);
      customResponse.headers.set("x-custom-domain", hostname);
      customResponse.headers.set("x-subdomain", customSubdomain);

      return customResponse;
    }
  }

  const subdomainConfig = {
    "preview.coderocket.app": "webcontainer",
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
    const pathname = request.nextUrl.pathname;
    const newUrl = new URL(
      `/webcontainer/_custom${pathname}${request.nextUrl.search}`,
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
