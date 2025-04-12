import { list } from "@vercel/blob";
import mime from "mime-types";
import { NextRequest, NextResponse } from "next/server";
export const revalidate = 0;
/**
 * Cette route sert les fichiers d'un dossier (prefix) stocké dans Vercel Blob.
 *   - /blob/:prefix/             => renvoie index.html (si existe)

 *   - /blob/:prefix/:slug...     => renvoie le fichier correspondant
 *   - Fallback SPA sur index.html si aucun fichier trouvé OU slug sans extension (routing client)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ prefix: string; slug?: string[] }> },
) {
  console.log("API Route: Reçu requête pour", request.url);

  // 1. Déterminer le prefix et le slug depuis l'URL
  const hostname = request.headers.get("host");
  const { pathname } = new URL(request.url);

  let prefix: string;
  let slug: string[] = [];

  if (hostname?.includes("coderocket.app")) {
    // Format : prefix.coderocket.app/slug...
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

  // 5. Forcer le fallback si le slug n'a pas d'extension
  const lastSegment = slug[slug.length - 1];
  const hasExtension = lastSegment?.includes(".");

  // Avoid fallback for JavaScript module requests
  if (slug.length > 0 && !hasExtension && !lastSegment?.endsWith(".js")) {
    console.log(
      "API Route: Slug sans extension, fallback forcé vers index.html",
    );
    matchedBlob = undefined;
  }

  // 6. Fallback SPA : si le fichier n'existe pas OU slug sans extension
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

  const responseData = await blobResp.arrayBuffer();

  // 8. Détermine le type MIME
  let mimeType: string;
  if (matchedBlob.pathname.endsWith("index.html")) {
    mimeType = "text/html"; // 👈 Assure que index.html est servi correctement

    // Inject the iframe messenger script for cross-origin communication in HTML content
    if (hostname?.includes("coderocket.app")) {
      const htmlContent = new TextDecoder("utf-8").decode(responseData);

      // Add our messenger script with verification mechanism - include directly instead of external script
      const inlineScript = `
<script>
// Inline iframe messenger to ensure it's loaded
(function() {
  console.log("[Buildr] Inline messenger loaded");

  // Track if we're in selection mode
  let selectionModeActive = false;
  let currentHighlightElement = null;

  // Function to generate CSS selector for an element
  function generateSelector(element) {
    let selector = element.tagName.toLowerCase();
    if (element.id) {
      selector += "#" + element.id;
    } else if (element.classList.length > 0) {
      const classList = Array.from(element.classList).filter(cls => !cls.includes('tailwind-ai-highlight'));
      if (classList.length > 0) {
        selector += "." + classList.join(".");
      }
    }
    return selector;
  }

  // Create style element for highlighting
  function injectHighlightStyles() {
    if (document.getElementById('tailwind-ai-highlight-styles')) return;

    const style = document.createElement('style');
    style.id = 'tailwind-ai-highlight-styles';
    style.textContent = \`
      .tailwind-ai-highlight {
        outline: 2px dashed rgba(124, 58, 237, 0.8) !important;
        outline-offset: 2px !important;
        position: relative !important;
      }
      .tailwind-ai-highlight::before {
        content: attr(data-tailwind-ai-selector);
        position: absolute;
        top: -24px;
        left: 0;
        background: rgb(124, 58, 237);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 999999;
      }
    \`;
    document.head.appendChild(style);
  }

  // Function to highlight an element on hover
  function highlightHoverElement(element) {
    if (currentHighlightElement) {
      // Remove previous highlight
      currentHighlightElement.classList.remove('tailwind-ai-highlight');
      currentHighlightElement.removeAttribute('data-tailwind-ai-selector');
      currentHighlightElement = null;
    }

    if (element && element.tagName !== 'HTML' && element.tagName !== 'BODY') {
      // Add highlight to current element
      currentHighlightElement = element;
      const selector = generateSelector(element);
      element.classList.add('tailwind-ai-highlight');
      element.setAttribute('data-tailwind-ai-selector', selector);
    }
  }

  // Function to create permanent highlight for selected element
  function highlightSelectedElement(element) {
    // Create permanent highlight
    const rect = element.getBoundingClientRect();
    const highlight = document.createElement("div");
    highlight.className = "tailwind-ai-selected";
    highlight.style.position = "absolute";
    highlight.style.left = rect.left + "px";
    highlight.style.top = rect.top + "px";
    highlight.style.width = rect.width + "px";
    highlight.style.height = rect.height + "px";
    highlight.style.background = "rgba(66, 153, 225, 0.3)";
    highlight.style.border = "2px solid rgba(66, 153, 225, 0.8)";
    highlight.style.borderRadius = "3px";
    highlight.style.zIndex = "10000";
    highlight.style.pointerEvents = "none";
    document.body.appendChild(highlight);

    setTimeout(() => {
      if (document.body.contains(highlight)) {
        document.body.removeChild(highlight);
      }
    }, 1500);
  }

  // Handle mouse move for hover highlighting
  function handleMouseMove(e) {
    if (!selectionModeActive) return;
    highlightHoverElement(e.target);
    e.stopPropagation();
  }

  // Listen for messages from parent
  window.addEventListener("message", function(event) {
    console.log("[Buildr] Message received in iframe:", event.data?.type);

    if (event.data && event.data.type === "get-element-selector") {
      console.log("[Buildr] Element selection mode activated");

      // Inject styles for highlighting
      injectHighlightStyles();

      // Enable selection mode
      selectionModeActive = true;

      // Add mousemove handler for highlighting elements on hover
      document.addEventListener('mousemove', handleMouseMove);

      // Notify parent that we received the request
      window.parent.postMessage({
        type: "element-selector-activated",
        status: "ready"
      }, "*");

      // Add click handler
      document.addEventListener("click", function elementSelectorHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("[Buildr] Element clicked:", e.target.tagName);

        // Highlight selected element
        highlightSelectedElement(e.target);

        // Generate selector and send it back
        const selector = generateSelector(e.target);
        console.log("[Buildr] Selector:", selector);

        window.parent.postMessage({
          type: "element-selector-result",
          selector: selector
        }, "*");

        // Clean up
        selectionModeActive = false;
        document.removeEventListener('mousemove', handleMouseMove);
        if (currentHighlightElement) {
          currentHighlightElement.classList.remove('tailwind-ai-highlight');
          currentHighlightElement.removeAttribute('data-tailwind-ai-selector');
          currentHighlightElement = null;
        }

        // Remove handler
        document.removeEventListener("click", elementSelectorHandler);
      }, { once: true });
    } else if (event.data && event.data.type === "cancel-element-selector") {
      // Clean up if selection is canceled
      selectionModeActive = false;
      document.removeEventListener('mousemove', handleMouseMove);
      if (currentHighlightElement) {
        currentHighlightElement.classList.remove('tailwind-ai-highlight');
        currentHighlightElement.removeAttribute('data-tailwind-ai-selector');
        currentHighlightElement = null;
      }
    }
  });

  // Notify parent that script is ready
  console.log("[Buildr] Sending ready message to parent");
  window.parent.postMessage({
    type: "iframe-messenger-ready",
    status: "loaded"
  }, "*");
})();
</script>`;

      // Insert the inline script at the end of the body
      let updatedHtml = htmlContent;
      if (updatedHtml.includes("</body>")) {
        updatedHtml = updatedHtml.replace("</body>", `${inlineScript}</body>`);
      } else if (updatedHtml.includes("</html>")) {
        updatedHtml = updatedHtml.replace("</html>", `${inlineScript}</html>`);
      } else {
        updatedHtml = updatedHtml + inlineScript;
      }

      // Create a new response with the modified HTML
      return new NextResponse(updatedHtml, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "Surrogate-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "*",
          "X-Frame-Options": "ALLOWALL",
          "Content-Security-Policy": "frame-ancestors *",
          "Cross-Origin-Opener-Policy": "unsafe-none",
          "Cross-Origin-Embedder-Policy": "credentialless",
          "Cross-Origin-Resource-Policy": "cross-origin",
        },
      });
    }
  } else if (matchedBlob.pathname.endsWith(".js")) {
    mimeType = "application/javascript"; // 👈 Correct MIME type for JavaScript
  } else {
    const extension = "." + (filePath.split(".").pop() ?? "");
    mimeType = mime.lookup(extension) || "application/octet-stream";
  }

  console.log("API Route: Servant fichier avec Content-Type", mimeType);

  return new NextResponse(responseData, {
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

      // Cross-Origin Isolation et accès au document
      "Cross-Origin-Opener-Policy": "unsafe-none",
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
