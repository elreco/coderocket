import { list, type ListBlobResultBlob } from "@vercel/blob";
import mime from "mime-types";
import { NextRequest, NextResponse } from "next/server";

import { getSubscription } from "@/app/supabase-server";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 0;

const STATIC_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";
const HTML_CACHE_CONTROL = "no-cache";

const findBlobByPathname = async (
  targetPathname: string,
): Promise<ListBlobResultBlob | null> => {
  let cursor: string | undefined;

  do {
    const {
      blobs,
      hasMore,
      cursor: nextCursor,
    } = await list({
      prefix: targetPathname,
      limit: 100,
      cursor,
    });

    const exactMatch = blobs.find((blob) => blob.pathname === targetPathname);
    if (exactMatch) {
      return exactMatch;
    }

    if (!hasMore) {
      return null;
    }

    cursor = nextCursor;
  } while (cursor);

  return null;
};

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

  const url = new URL(request.url);
  const { prefix: routePrefix, slug: routeSlug = [] } = await context.params;
  const originalHostname = request.headers.get("host") || "";
  const hostname = url.hostname || originalHostname || "";
  const pathname = url.pathname;
  const notFoundHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>Not Found - CodeRocket</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: hsl(240, 20%, 99%);
                color: hsl(222.2, 84%, 4.9%);
                padding: 1rem;
              }
              .container {
                text-align: center;
                max-width: 600px;
                padding: 3rem 2rem;
              }
              .logo {
                width: 120px;
                height: auto;
                margin: 0 auto 2rem;
                display: block;
              }
              h1 {
                font-size: clamp(1.75rem, 4vw, 2.5rem);
                font-weight: 700;
                margin-bottom: 1rem;
                color: hsl(222.2, 84%, 4.9%);
                line-height: 1.2;
              }
              p {
                font-size: clamp(1rem, 2vw, 1.125rem);
                color: hsl(240, 10%, 50%);
                margin-bottom: 2rem;
                line-height: 1.6;
              }
              .button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.75rem 1.5rem;
                background: hsl(239, 84%, 67%);
                color: hsl(210, 40%, 98%);
                text-decoration: none;
                border-radius: 0.5rem;
                font-weight: 600;
                font-size: 1rem;
                transition: all 0.2s ease;
                border: none;
                cursor: pointer;
              }
              .button:hover {
                background: hsl(239, 84%, 60%);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
              }
              .button:active {
                transform: translateY(0);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="https://www.coderocket.app/logo.png" alt="CodeRocket" class="logo" />
              <h1>Application Not Found</h1>
              <p>This application is not deployed or doesn't exist.</p>
              <a href="https://www.coderocket.app" class="button">Go to CodeRocket</a>
            </div>
          </body>
        </html>
      `;

  const premiumRequiredHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>Premium Required - CodeRocket</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: hsl(240, 20%, 99%);
                color: hsl(222.2, 84%, 4.9%);
                padding: 1rem;
              }
              .container {
                text-align: center;
                max-width: 600px;
                padding: 3rem 2rem;
              }
              .logo {
                width: 120px;
                height: auto;
                margin: 0 auto 2rem;
                display: block;
              }
              h1 {
                font-size: clamp(1.75rem, 4vw, 2.5rem);
                font-weight: 700;
                margin-bottom: 1rem;
                color: hsl(222.2, 84%, 4.9%);
                line-height: 1.2;
              }
              p {
                font-size: clamp(1rem, 2vw, 1.125rem);
                color: hsl(240, 10%, 50%);
                margin-bottom: 2rem;
                line-height: 1.6;
              }
              .button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.75rem 1.5rem;
                background: hsl(239, 84%, 67%);
                color: hsl(210, 40%, 98%);
                text-decoration: none;
                border-radius: 0.5rem;
                font-weight: 600;
                font-size: 1rem;
                transition: all 0.2s ease;
                border: none;
                cursor: pointer;
              }
              .button:hover {
                background: hsl(239, 84%, 60%);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
              }
              .button:active {
                transform: translateY(0);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="https://www.coderocket.app/logo.png" alt="CodeRocket" class="logo" />
              <h1>Premium Required</h1>
              <p>This deployment requires an active premium subscription. The site owner needs to upgrade to keep this site online.</p>
              <a href="https://www.coderocket.app/pricing" class="button">Upgrade to Premium</a>
            </div>
          </body>
        </html>
      `;

  const createNotFoundResponse = () =>
    new NextResponse(notFoundHtml, {
      status: 404,
      headers: {
        "Content-Type": "text/html",
      },
    });

  const createPremiumRequiredResponse = () =>
    new NextResponse(premiumRequiredHtml, {
      status: 403,
      headers: {
        "Content-Type": "text/html",
      },
    });

  const deriveSlugFromPath = () => {
    if (pathname.startsWith("/webcontainer/")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length > 1) {
        parts.shift();
        if (parts[0] === "_custom") {
          parts.shift();
        } else if (parts[0] === routePrefix) {
          parts.shift();
        } else {
          const hostIdentifier = hostname.split(".")[0];
          if (parts[0] === hostIdentifier) {
            parts.shift();
          }
        }
        return parts;
      }
    } else if (pathname !== "/") {
      return pathname.slice(1).split("/");
    }
    return [];
  };

  const isCustomDomainHost =
    hostname &&
    !hostname.includes("coderocket.app") &&
    !hostname.includes("localhost") &&
    !hostname.includes("127.0.0.1");

  let prefix = routePrefix;
  let slug: string[] = routeSlug;

  if (isCustomDomainHost) {
    slug = deriveSlugFromPath();
    const supabase = await createClient();
    const { data: customDomain } = await supabase
      .from("custom_domains")
      .select("chat_id, is_verified")
      .eq("domain", hostname)
      .eq("is_verified", true)
      .maybeSingle();

    if (!customDomain) {
      return createNotFoundResponse();
    }

    const { data: chat } = await supabase
      .from("chats")
      .select("id, deployed_version, user_id")
      .eq("id", customDomain.chat_id)
      .eq("is_deployed", true)
      .maybeSingle();

    if (!chat || chat.deployed_version === null) {
      return createNotFoundResponse();
    }

    const subscription = await getSubscription(chat.user_id);
    if (!subscription) {
      return createPremiumRequiredResponse();
    }

    prefix = `${chat.id}-${chat.deployed_version}`;
    console.log("API Route: Custom domain resolved to prefix =", prefix);
  } else if (hostname.includes("coderocket.app")) {
    slug = deriveSlugFromPath();
    prefix = hostname.split(".")[0];

    const isUuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+$/i.test(
        prefix,
      );

    if (!isUuidPattern) {
      const supabase = await createClient();
      const { data: chat, error } = await supabase
        .from("chats")
        .select("id, deployed_version, user_id")
        .eq("deploy_subdomain", prefix)
        .eq("is_deployed", true)
        .single();

      if (error || !chat || chat.deployed_version === null) {
        return createNotFoundResponse();
      }

      const subscription = await getSubscription(chat.user_id);
      if (!subscription) {
        return createPremiumRequiredResponse();
      }

      prefix = `${chat.id}-${chat.deployed_version}`;
      console.log("API Route: Subdomain resolved to prefix =", prefix);
    }
  } else {
    prefix = routePrefix;
    slug = routeSlug;
  }

  console.log("API Route: Prefix =", prefix, "| Slug =", slug);

  // 2. Construit le chemin complet dans le storage
  const fileSubPath = slug.join("/");
  const filePath = fileSubPath
    ? `${prefix}/${fileSubPath}`
    : `${prefix}/index.html`;

  console.log("API Route: Recherche fichier", filePath);

  // 3. Recherche ciblée du fichier exact (évite de lister tout le prefix du projet)
  let matchedBlob = await findBlobByPathname(filePath);

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
      matchedBlob = await findBlobByPathname(fallbackPath);

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
    return new NextResponse("Try to refresh the page", { status: 500 });
  }

  let data = await blobResp.arrayBuffer();

  // 8. Détermine le type MIME
  let mimeType: string;
  const isIndexHtml = matchedBlob.pathname.endsWith("index.html");
  if (isIndexHtml) {
    mimeType = "text/html";
  } else if (matchedBlob.pathname.endsWith(".js")) {
    mimeType = "application/javascript";
  } else {
    const extension = "." + (matchedBlob.pathname.split(".").pop() ?? "");
    mimeType = mime.lookup(extension) || "application/octet-stream";
  }

  // Inject element selection script into HTML files
  if (isIndexHtml || mimeType === "text/html") {
    const htmlContent = new TextDecoder().decode(data);
    const selectionScript = `
<script>
(function() {
  let selectionModeActive = false;
  let highlightElement = null;
  let highlightStyle = null;
  let currentPreviewPath = window.location.pathname || '/';
  let isHtmlFramework = true;

  function extractElementData(element) {
    if (!element) return null;

    const dataAttributes = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith('data-')) {
        dataAttributes[attr.name] = attr.value;
      }
    }

    const classes = Array.from(element.classList || []);
    const computedStyle = window.getComputedStyle ? window.getComputedStyle(element) : null;
    const styles = {};
    if (computedStyle) {
      const importantStyles = ['color', 'backgroundColor', 'fontSize', 'fontFamily', 'padding', 'margin', 'border', 'display', 'position'];
      importantStyles.forEach(prop => {
        const value = computedStyle.getPropertyValue(prop);
        if (value) {
          styles[prop] = value;
        }
      });
    }

    let filePath = undefined;
    try {
      const path = window.location.pathname || currentPreviewPath || '/';
      if (path === '/' || path === '') {
        filePath = '/';
      } else {
        let cleanPath = path.startsWith('/') ? path.substring(1) : path;
        if (cleanPath.endsWith('/')) {
          cleanPath = cleanPath.slice(0, -1);
        }

        if (isHtmlFramework) {
          if (!cleanPath.endsWith('.html') && !cleanPath.includes('.')) {
            cleanPath = cleanPath + '.html';
          }
          const fileName = cleanPath.split('/').pop() || 'index.html';
          filePath = '/' + fileName;
        } else {
          filePath = cleanPath ? '/' + cleanPath : '/';
        }
      }
    } catch (e) {
      filePath = '/';
    }

    return {
      html: element.outerHTML.substring(0, 2000),
      tagName: element.tagName.toLowerCase(),
      classes: classes,
      dataAttributes: dataAttributes,
      styles: styles,
      filePath: filePath
    };
  }

  function highlightElementAtPoint(x, y) {
    try {
      const element = document.elementFromPoint(x, y);
      if (!element || element === highlightElement) return;

      if (highlightStyle !== null && highlightElement) {
        highlightElement.style.removeProperty('outline');
        highlightElement.style.removeProperty('outline-offset');
      }

      highlightElement = element;
      highlightStyle = element.style.cssText;
      element.style.outline = '2px solid #6366F1';
      element.style.outlineOffset = '2px';
    } catch (e) {
    }
  }

  function clearHighlight() {
    if (highlightElement && highlightStyle !== null) {
      highlightElement.style.cssText = highlightStyle;
      highlightElement = null;
      highlightStyle = null;
    }
  }

  function updatePreviewPathFromLocation() {
    const path = window.location.pathname || '/';
    if (path !== currentPreviewPath) {
      currentPreviewPath = path;
    }
  }

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function(...args) {
    const result = originalPushState.apply(this, args);
    updatePreviewPathFromLocation();
    return result;
  };

  window.history.replaceState = function(...args) {
    const result = originalReplaceState.apply(this, args);
    updatePreviewPathFromLocation();
    return result;
  };

  window.addEventListener('popstate', updatePreviewPathFromLocation);
  window.addEventListener('hashchange', updatePreviewPathFromLocation);

  window.addEventListener('message', function(event) {
    if (event.data && typeof event.data === 'object') {
      if (event.data.type === 'coderocket-selection-mode') {
        selectionModeActive = event.data.enabled === true;
        if (event.data.previewPath !== undefined) {
          currentPreviewPath = event.data.previewPath || '/';
        } else {
          updatePreviewPathFromLocation();
        }
        if (event.data.isHtmlFramework !== undefined) {
          isHtmlFramework = event.data.isHtmlFramework === true;
        }
        if (!selectionModeActive) {
          clearHighlight();
        }
      } else if (event.data.type === 'coderocket-element-hover' && selectionModeActive) {
        highlightElementAtPoint(event.data.x, event.data.y);
      } else if (event.data.type === 'coderocket-element-select' && selectionModeActive) {
        const element = document.elementFromPoint(event.data.x, event.data.y);
        const elementData = extractElementData(element);

        if (elementData) {
          window.parent.postMessage({
            type: 'coderocket-element-selected',
            element: elementData
          }, '*');
        }

        clearHighlight();
      } else if (event.data.type === 'coderocket-scroll' && selectionModeActive) {
        const scrollableElement = document.elementFromPoint(event.data.x, event.data.y);
        if (scrollableElement) {
          let target = scrollableElement;
          while (target && target !== document.body) {
            if (target.scrollHeight > target.clientHeight || target.scrollWidth > target.clientWidth) {
              target.scrollBy(event.data.deltaX || 0, event.data.deltaY || 0);
              break;
            }
            target = target.parentElement;
          }
          if (!target || target === document.body) {
            window.scrollBy(event.data.deltaX || 0, event.data.deltaY || 0);
          }
        } else {
          window.scrollBy(event.data.deltaX || 0, event.data.deltaY || 0);
        }
      }
    }
  });
})();
</script>`;

    let modifiedHtml: string;
    const coderocketStart = "<!-- CODEROCKET -->";
    const coderocketEnd = "<!-- /CODEROCKET -->";
    const coderocketBlock =
      coderocketStart + "\n" + selectionScript + "\n" + coderocketEnd;

    if (
      htmlContent.includes(coderocketStart) &&
      htmlContent.includes(coderocketEnd)
    ) {
      const regex = new RegExp(
        coderocketStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "[\\s\\S]*?" +
          coderocketEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g",
      );
      modifiedHtml = htmlContent.replace(regex, coderocketBlock);
    } else if (htmlContent.includes("</body>")) {
      modifiedHtml = htmlContent.replace(
        "</body>",
        coderocketBlock + "\n</body>",
      );
    } else if (htmlContent.includes("</html>")) {
      modifiedHtml = htmlContent.replace(
        "</html>",
        coderocketBlock + "\n</html>",
      );
    } else {
      modifiedHtml = htmlContent + coderocketBlock;
    }
    const encoded = new TextEncoder().encode(modifiedHtml);
    data = new Uint8Array(encoded).buffer;
  }

  console.log("API Route: Servant fichier avec Content-Type", mimeType);
  console.log(
    "API Route: Original hostname =",
    originalHostname,
    "| URL hostname =",
    url.hostname,
  );

  if (isIndexHtml && originalHostname?.includes("preview.coderocket.app")) {
    const parts = prefix.split("-");
    parts.pop();
    const chatId = parts.join("-");
    const supabase = await createClient();
    const { data: chat } = await supabase
      .from("chats")
      .select("slug")
      .eq("id", chatId)
      .maybeSingle();

    const chatSlug = chat?.slug || null;
    const iframeSrc = `https://${prefix}.webcontainer.coderocket.app${slug.length > 0 ? "/" + slug.join("/") : ""}`;
    const watermarkUrl = chatSlug
      ? `https://www.coderocket.app/components/${chatSlug}`
      : "https://www.coderocket.app";

    const htmlWithWatermark = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeRocket Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; overflow: hidden; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #watermark {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 9999;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #watermark a {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #6366F1;
      padding: 8px 12px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      text-decoration: none;
      transition: background 0.2s;
    }
    #watermark a:hover {
      background: #4F46E5;
    }
    #watermark img {
      width: 24px;
      height: 24px;
    }
    #watermark span {
      color: white;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    iframe {
      width: 100%;
      height: 100vh;
      border: none;
    }
  </style>
</head>
<body>
  <div id="watermark">
    <a href="${watermarkUrl}" target="_blank" rel="noopener noreferrer">
      <img src="https://www.coderocket.app/logo-white.png" alt="CodeRocket" />
      <span>Built with CodeRocket 🚀</span>
    </a>
  </div>
  <iframe id="preview-iframe" src="${iframeSrc}"></iframe>
  <script>
    (function() {
      const iframe = document.getElementById('preview-iframe');
      const baseUrl = window.location.origin;

      function updateUrl(path) {
        const newUrl = baseUrl + (path === '/' ? '' : path);
        window.history.pushState({ path: path }, '', newUrl);
      }

      function updateIframeSrc(path) {
        const currentSrc = iframe.src;
        const url = new URL(currentSrc);
        url.pathname = path === '/' ? '' : path;
        iframe.src = url.toString();
      }

      window.addEventListener('message', function(event) {
        if (
          !event.data ||
          typeof event.data !== 'object' ||
          event.data.type !== 'coderocket-route-change'
        ) {
          return;
        }

        const path = event.data.path;
        if (typeof path !== 'string') {
          return;
        }

        if (event.origin && event.origin !== 'null') {
          try {
            const originHost = new URL(event.origin).hostname;
            const allowedHosts = [
              'preview.coderocket.app',
              'webcontainer.coderocket.app',
            ];
            const isAllowed = allowedHosts.some(
              (host) => originHost === host || originHost.endsWith('.' + host),
            );
            if (!isAllowed) {
              return;
            }
          } catch {
            return;
          }
        }

        updateUrl(path);
      });

      window.addEventListener('popstate', function(event) {
        const path = window.location.pathname;
        updateIframeSrc(path);
      });

      const initialPath = window.location.pathname;
      if (initialPath !== '/' && initialPath !== '') {
        updateIframeSrc(initialPath);
      }
    })();
  </script>
</body>
</html>`;

    return new NextResponse(htmlWithWatermark, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": HTML_CACHE_CONTROL,
      },
    });
  }

  const cacheControl =
    isIndexHtml || mimeType === "text/html"
      ? HTML_CACHE_CONTROL
      : STATIC_ASSET_CACHE_CONTROL;

  return new NextResponse(data, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": cacheControl,
    },
  });
}
