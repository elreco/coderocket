"use client";

import React, { useCallback, useEffect, useState } from "react";

import type { ChatFile } from "@/utils/completion-parser";

interface RenderHtmlComponentProps {
  files: ChatFile[];
  navigationTarget?: string;
  onNavigation?: (path: string, options?: { pushHistory?: boolean }) => void;
  onRouteChange?: (path: string) => void;
}

export default function RenderHtmlComponent({
  files,
  navigationTarget,
  onNavigation,
  onRouteChange,
}: RenderHtmlComponentProps) {
  const [currentFile, setCurrentFile] = useState<ChatFile | null>(
    files.length > 0 ? files[0] : null,
  );
  const [currentRoute, setCurrentRoute] = useState("/");

  useEffect(() => {
    if (files.length > 0) {
      setCurrentFile(files[0]);
      setCurrentRoute("/");
    } else {
      setCurrentFile(null);
      setCurrentRoute("/");
    }
  }, [files]);

  const findFileByName = useCallback(
    (name: string): ChatFile | null => {
      let file = files.find((f) => f.name === name);
      if (!file && name.startsWith("./")) {
        file = files.find((f) => f.name === name.substring(2));
      }
      if (!file) {
        const fileName = name.split("/").pop();
        if (fileName) {
          file = files.find((f) => f.name === fileName);
        }
      }
      return file || null;
    },
    [files],
  );

  const normalizeRoute = useCallback((value: string) => {
    if (!value) {
      return "/";
    }
    let route = value.trim();
    if (route.startsWith("http://") || route.startsWith("https://")) {
      return "/";
    }
    if (route.startsWith("./")) {
      route = route.slice(1);
    }
    if (!route.startsWith("/")) {
      route = `/${route}`;
    }
    if (route.includes("?")) {
      route = route.split("?")[0];
    }
    if (route.includes("#")) {
      route = route.split("#")[0];
    }
    return route === "" ? "/" : route.replace(/\/+/g, "/");
  }, []);

  const resolveFileFromRoute = useCallback(
    (route: string): ChatFile | null => {
      if (!files.length) {
        return null;
      }
      const trimmed = route === "/" ? "index.html" : route.replace(/^\//, "");
      const candidates = [trimmed];
      if (!trimmed.endsWith(".html")) {
        candidates.push(`${trimmed}.html`);
        candidates.push(`${trimmed}/index.html`);
      }
      if (!trimmed.startsWith("./")) {
        candidates.push(`./${trimmed}`);
      }
      for (const candidate of candidates) {
        const found = findFileByName(candidate);
        if (found) {
          return found;
        }
      }
      return files[0] || null;
    },
    [files, findFileByName],
  );

  const handleInternalNavigation = useCallback(
    (
      target: string,
      options?: { pushHistory?: boolean; notifyParent?: boolean },
    ) => {
      const normalizedRoute = normalizeRoute(target);
      const file = resolveFileFromRoute(normalizedRoute);
      if (!file) {
        return;
      }
      setCurrentFile(file);
      setCurrentRoute(normalizedRoute);
      if (options?.notifyParent === false) {
        return;
      }
      onNavigation?.(normalizedRoute, {
        pushHistory: options?.pushHistory,
      });
      onRouteChange?.(normalizedRoute);
    },
    [normalizeRoute, onNavigation, onRouteChange, resolveFileFromRoute],
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data && event.data.type === "linkClick") {
        const href = event.data.href;
        if (href.startsWith("#")) {
          return;
        }
        handleInternalNavigation(href, { pushHistory: true });
      }
    },
    [handleInternalNavigation],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

  useEffect(() => {
    if (!navigationTarget) {
      return;
    }
    handleInternalNavigation(navigationTarget, {
      pushHistory: false,
      notifyParent: false,
    });
  }, [handleInternalNavigation, navigationTarget]);

  const injectLinkInterceptor = (content: string): string => {
    const script = `
      <script>
        document.addEventListener('click', function(e) {
          // Find closest anchor element
          let target = e.target;
          while (target && target.tagName !== 'A') {
            target = target.parentElement;
          }

          // If we found an anchor with href
          if (target && target.href) {
            const href = target.getAttribute('href');

            // Don't intercept anchor links (let browser handle them)
            if (href && href.startsWith('#')) {
              return;
            }

            // Always prevent default navigation
            e.preventDefault();

            // Only send message for relative links (internal navigation)
            if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//')) {
              // Send message to parent for internal links
              window.parent.postMessage({
                type: 'linkClick',
                href: href
              }, '*');
            }
            // For external links, do nothing (navigation is blocked)
          }
        }, true);
      </script>
    `;

    // Insert script before closing body tag
    if (content.includes("</body>")) {
      return content.replace("</body>", `${script}</body>`);
    }

    // If no body tag, append to the end
    return content + script;
  };

  // Prepare content with interceptor script
  const prepareContent = (): string => {
    if (!currentFile) return "";
    return injectLinkInterceptor(currentFile.content);
  };

  return (
    <iframe
      key={currentRoute}
      srcDoc={prepareContent()}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
      }}
      className="bg-white"
      loading="eager"
    />
  );
}
