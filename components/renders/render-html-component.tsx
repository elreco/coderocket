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
    const hashIndex = route.indexOf("#");
    const hash = hashIndex !== -1 ? route.substring(hashIndex) : "";
    if (hashIndex !== -1) {
      route = route.substring(0, hashIndex);
    }
    route = route === "" ? "/" : route.replace(/\/+/g, "/");
    return route + hash;
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
      const hashIndex = normalizedRoute.indexOf("#");
      const routeWithoutHash =
        hashIndex !== -1
          ? normalizedRoute.substring(0, hashIndex)
          : normalizedRoute;
      const file = resolveFileFromRoute(routeWithoutHash);
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
          const iframe = document.querySelector(
            "iframe[srcDoc]",
          ) as HTMLIFrameElement;
          if (iframe?.contentWindow) {
            try {
              const targetElement = iframe.contentDocument?.querySelector(href);
              if (targetElement) {
                targetElement.scrollIntoView({ behavior: "smooth" });
                const currentRouteWithHash = currentRoute.split("#")[0] + href;
                setCurrentRoute(currentRouteWithHash);
                onNavigation?.(currentRouteWithHash, { pushHistory: true });
                onRouteChange?.(currentRouteWithHash);
              }
            } catch (e) {
              console.error("Error scrolling to anchor:", e);
            }
          }
          return;
        }
        handleInternalNavigation(href, { pushHistory: true });
      }
    },
    [handleInternalNavigation, currentRoute, onNavigation, onRouteChange],
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
    const hashIndex = navigationTarget.indexOf("#");
    const hash = hashIndex !== -1 ? navigationTarget.substring(hashIndex) : "";
    handleInternalNavigation(navigationTarget, {
      pushHistory: false,
      notifyParent: false,
    });
    if (hash) {
      const iframe = document.querySelector(
        "iframe[srcDoc]",
      ) as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        setTimeout(() => {
          try {
            const targetElement = iframe.contentDocument?.querySelector(hash);
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: "smooth" });
            }
          } catch (e) {
            console.error("Error scrolling to anchor:", e);
          }
        }, 100);
      }
    }
  }, [handleInternalNavigation, navigationTarget]);

  const injectLinkInterceptor = (content: string): string => {
    const script = `
      <script>
        document.addEventListener('click', function(e) {
          let target = e.target;
          while (target && target.tagName !== 'A') {
            target = target.parentElement;
          }

          if (target && target.href) {
            const href = target.getAttribute('href');

            if (href && href.startsWith('#')) {
              e.preventDefault();
              const targetElement = document.querySelector(href);
              if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                window.parent.postMessage({
                  type: 'linkClick',
                  href: href
                }, '*');
              }
              return;
            }

            e.preventDefault();

            if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//')) {
              window.parent.postMessage({
                type: 'linkClick',
                href: href
              }, '*');
            }
          }
        }, true);
      </script>
    `;

    if (content.includes("</body>")) {
      return content.replace("</body>", `${script}</body>`);
    }

    return content + script;
  };

  // Prepare content with interceptor script
  const prepareContent = (): string => {
    if (!currentFile) return "";
    return injectLinkInterceptor(currentFile.content);
  };

  useEffect(() => {
    const hashIndex = currentRoute.indexOf("#");
    const hash = hashIndex !== -1 ? currentRoute.substring(hashIndex) : "";
    if (hash) {
      const iframe = document.querySelector(
        "iframe[srcDoc]",
      ) as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        const handleLoad = () => {
          setTimeout(() => {
            try {
              const targetElement = iframe.contentDocument?.querySelector(hash);
              if (targetElement) {
                targetElement.scrollIntoView({ behavior: "smooth" });
              }
            } catch (e) {
              console.error("Error scrolling to anchor:", e);
            }
          }, 100);
        };
        if (iframe.contentDocument?.readyState === "complete") {
          handleLoad();
        } else {
          iframe.addEventListener("load", handleLoad);
          return () => iframe.removeEventListener("load", handleLoad);
        }
      }
    }
  }, [currentRoute]);

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
      onLoad={() => {
        const hashIndex = currentRoute.indexOf("#");
        const hash = hashIndex !== -1 ? currentRoute.substring(hashIndex) : "";
        if (hash) {
          setTimeout(() => {
            const iframe = document.querySelector(
              "iframe[srcDoc]",
            ) as HTMLIFrameElement;
            if (iframe?.contentWindow) {
              try {
                const targetElement =
                  iframe.contentDocument?.querySelector(hash);
                if (targetElement) {
                  targetElement.scrollIntoView({ behavior: "smooth" });
                }
              } catch (e) {
                console.error("Error scrolling to anchor:", e);
              }
            }
          }, 100);
        }
      }}
    />
  );
}
