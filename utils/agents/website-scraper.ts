import chromium from "@sparticuz/chromium";
import { JSDOM } from "jsdom";
import puppeteer from "puppeteer-core";
import type { Page } from "puppeteer-core";

interface WebsiteContent {
  html: string;
  images: Array<{
    url: string;
    alt: string;
    dimensions?: { width: number; height: number };
    isVisible?: boolean;
    role?: string;
    className?: string;
    inViewport?: boolean;
    lazyLoaded?: boolean;
    type?: string;
    isHero?: boolean;
    style?: {
      border?: string;
      borderRadius?: string;
      boxShadow?: string;
      filter?: string;
      backgroundSize?: string;
      backgroundPosition?: string;
      backgroundRepeat?: string;
    };
  }>;
  title: string;
  description: string | null;
  url: string;
  screenshot?: string; // Base64 encoded screenshot
  sectionScreenshots?: Record<string, string>; // Base64 encoded section screenshots
  metaTags?: Record<string, string>;
  cssContent?: string[]; // Important CSS rules for better cloning
  structure?: {
    menu?: Array<{ text: string; url: string }>;
    sections?: Array<{
      title?: string;
      content?: string;
      type: string;
      headingCount?: number;
      imageCount?: number;
      paragraphCount?: number;
      className?: string;
      id?: string;
    }>;
    layout?: {
      header?: boolean;
      footer?: boolean;
      sidebar?: boolean;
      mainContent?: string;
      gridColumns?: number;
      flexDirection?: string;
      responsive?: boolean;
      mainContentStructure: {
        width: string | null;
        maxWidth: string | null;
        padding: string | null;
        margin: string | null;
        centeringStrategy: string | null;
        gap: string | null;
        columnCount: number | null;
        rowCount: number | null;
        columnWidths?: string[];
        gridPattern?: string;
        columnGap?: string;
      };
      responsiveDetails?: {
        mediaQueriesCount: number;
        hasViewportMeta: boolean;
        usesFlexibleUnits: boolean;
        breakpoints: string[];
      };
    };
    colors?: Array<string>;
    fonts?: Array<string>;
    buttons?: Array<{ text: string; style: string }>;
    domTreeDepth?: number;
    cta?: Array<{ text: string; url?: string; style?: string }>;
    imageStyles?: Array<{ style: string; count: number }>;
    spacingPattern?: string;
    cssVariables?: Record<string, string>;
    fontSources?: Array<string>;
    visualPatterns?: {
      cardPatterns: Array<{
        selector: string;
        count: number;
        structure: {
          hasImage: boolean;
          hasTitle: boolean;
          hasText: boolean;
          hasButton: boolean;
        };
      }>;
      visualHierarchy: {
        hasSeparators: boolean;
        usesDifferentBackgrounds: boolean;
        usesShadowsForDepth: boolean;
        usesTypographicHierarchy: boolean;
      };
      contentContainersCount: number;
      hasAlternatingRows: boolean;
    };
  };
}

/**
 * Fallback method to fetch website content using native fetch API
 */
async function fetchWebsiteContent(url: string): Promise<WebsiteContent> {
  try {
    // Use a more browser-like request with headers that may help bypass some protections
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "sec-ch-ua": '"Not.A/Brand";v="8", "Chromium";v="123"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    // If we got a successful response
    if (response.ok) {
      const html = await response.text();

      // Create a DOM from HTML content
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Extract title
      const title = document.querySelector("title")?.textContent || url;

      // Extract description
      const metaDescription = document.querySelector(
        'meta[name="description"]',
      );
      const description = metaDescription?.getAttribute("content") || null;

      // Extract images with proper type casting
      const imgElements = document.querySelectorAll("img");
      const images = Array.from(imgElements)
        .map((element) => {
          const img = element as HTMLImageElement;
          const src = img.getAttribute("src") || "";
          // Handle relative URLs
          const imageUrl = src.startsWith("http")
            ? src
            : new URL(src, url).toString();

          return {
            url: imageUrl,
            alt: img.getAttribute("alt") || "",
            dimensions: undefined,
          };
        })
        .filter(
          (img) =>
            img.url &&
            !img.url.startsWith("data:") &&
            !img.url.includes("placeholder"),
        );

      return {
        html,
        images,
        title,
        description,
        url,
      };
    } else {
      // Handle case where response is not OK
      console.warn(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
      );
      return {
        html: "",
        images: [],
        title: url,
        description: `Failed to fetch website content: ${response.status} ${response.statusText}`,
        url,
      };
    }
  } catch (error) {
    console.error("Error in fetch fallback:", error);
    return {
      html: "",
      images: [],
      title: url,
      description: `Failed to fetch website content`,
      url,
    };
  }
}

/**
 * Find Chrome/Chromium executable path on Windows machines
 */
async function findChromePath(): Promise<string | undefined> {
  const fs = await import("fs");
  const { execSync } = await import("child_process");

  // Potential Chrome/Chromium paths
  const chromePaths = [
    // Chrome paths
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    // Edge paths
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  // Try each path
  for (const chromePath of chromePaths) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Try registry lookup for Chrome
  try {
    const regQuery =
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve';
    const regResult = execSync(regQuery, { stdio: "pipe" }).toString();
    const match = regResult.match(/REG_(?:SZ|EXPAND_SZ)\s+([^\s]+)/);
    if (match && match[1] && fs.existsSync(match[1])) {
      return match[1];
    }
  } catch {
    console.log("No Chrome found in registry");
  }

  // Try registry lookup for Edge
  try {
    const regQuery =
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe" /ve';
    const regResult = execSync(regQuery, { stdio: "pipe" }).toString();
    const match = regResult.match(/REG_(?:SZ|EXPAND_SZ)\s+([^\s]+)/);
    if (match && match[1] && fs.existsSync(match[1])) {
      return match[1];
    }
  } catch {
    console.log("No Edge found in registry");
  }

  return undefined;
}

/**
 * Attend que le contenu dynamique soit chargé en surveillant les mutations du DOM
 */
async function waitForDynamicContentToLoad(page: Page): Promise<void> {
  try {
    // Surveiller si la page continue à charger du contenu après le chargement initial
    // par exemple via des appels AJAX, React/Vue updates, etc.
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        // Nombre de mutations importantes nécessaires pour considérer que la page continue à charger
        const MUTATION_THRESHOLD = 10;
        // Délai maximum d'attente (5 secondes)
        const MAX_WAIT_TIME = 5000;

        let significantMutations = 0;
        let lastSignificantMutationTime = Date.now();

        // Considérer la page comme stable si aucune mutation significative
        // n'a été détectée pendant 1 seconde
        const STABLE_THRESHOLD = 1000;

        // Créer un observateur de mutations pour détecter les changements de DOM
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            // Ne considérer que les ajouts de nœuds ou les modifications d'attributs importants
            if (
              mutation.type === "childList" &&
              mutation.addedNodes.length > 0
            ) {
              // Si on ajoute des éléments importants comme des divs, imgs, etc.
              for (let i = 0; i < mutation.addedNodes.length; i++) {
                const node = mutation.addedNodes[i];
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const tag = (node as Element).tagName.toLowerCase();
                  if (
                    [
                      "div",
                      "img",
                      "picture",
                      "section",
                      "article",
                      "main",
                      "ul",
                      "ol",
                      "li",
                      "a",
                    ].includes(tag)
                  ) {
                    significantMutations++;
                    lastSignificantMutationTime = Date.now();
                    break;
                  }
                }
              }
            } else if (mutation.type === "attributes") {
              // Si on modifie des attributs importants comme src, style, class
              const attributeName = mutation.attributeName;
              if (
                ["src", "style", "class", "data-src", "srcset"].includes(
                  attributeName || "",
                )
              ) {
                significantMutations++;
                lastSignificantMutationTime = Date.now();
                break;
              }
            }
          }
        });

        // Observer tout le document avec toutes les options
        observer.observe(document.documentElement, {
          childList: true,
          attributes: true,
          characterData: true,
          subtree: true,
          attributeOldValue: true,
          characterDataOldValue: true,
        });

        // Timer pour vérifier l'état de chargement
        const checkInterval = setInterval(() => {
          const currentTime = Date.now();

          // Si aucune mutation significative pendant STABLE_THRESHOLD ms, on considère que le chargement est terminé
          if (
            currentTime - lastSignificantMutationTime > STABLE_THRESHOLD &&
            significantMutations > MUTATION_THRESHOLD
          ) {
            console.log(
              `Contenu dynamique stabilisé après ${significantMutations} mutations.`,
            );
            clearInterval(checkInterval);
            observer.disconnect();
            resolve();
          }

          // Si on dépasse le délai maximum, on arrête d'attendre
          if (currentTime - lastSignificantMutationTime > MAX_WAIT_TIME) {
            console.log("Délai maximum dépassé pour le chargement dynamique.");
            clearInterval(checkInterval);
            observer.disconnect();
            resolve();
          }
        }, 100);

        // Timeout de sécurité après MAX_WAIT_TIME
        setTimeout(() => {
          clearInterval(checkInterval);
          observer.disconnect();
          resolve();
        }, MAX_WAIT_TIME);
      });
    });

    // Attendre encore un peu pour s'assurer que tous les éléments visuels sont rendus
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error("Erreur lors de l'attente du contenu dynamique:", error);
    // Continuer même en cas d'erreur
  }
}

/**
 * Gère les animations de chargement et détecte le scroll infini
 * pour garantir que le contenu est complètement chargé
 */
async function handleLoadingAnimationsAndInfiniteScroll(
  page: Page,
): Promise<void> {
  try {
    // 1. Vérifier si la page utilise des animations en CSS ou des transitions
    const hasAnimations = await page.evaluate(() => {
      // Rechercher les règles CSS avec des animations ou transitions
      const hasAnimationStyles = Array.from(document.styleSheets).some(
        (sheet) => {
          try {
            if (!sheet.cssRules) return false;
            return Array.from(sheet.cssRules).some((rule) => {
              const cssText = rule.cssText || "";
              return (
                cssText.includes("@keyframes") ||
                cssText.includes("animation") ||
                cssText.includes("transition") ||
                cssText.includes("transform")
              );
            });
          } catch {
            return false; // CORS peut empêcher l'accès à certaines feuilles
          }
        },
      );

      // Vérifier si des éléments contiennent des styles d'animation
      const animatedElements = document.querySelectorAll(
        '[style*="animation"], [style*="transition"], [class*="animate"], [class*="fade"], [class*="slide"]',
      );

      return hasAnimationStyles || animatedElements.length > 0;
    });

    // Si la page utilise des animations, attendre qu'elles se terminent
    if (hasAnimations) {
      console.log("Animations détectées, attente supplémentaire...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 2. Détecter le scroll infini en simulant un scroll vers le bas
    const isInfiniteScroll = await page.evaluate(async () => {
      const initialHeight = document.body.scrollHeight;

      // Simuler un scroll à 80% de la page
      window.scrollTo(0, document.body.scrollHeight * 0.8);

      // Attendre un peu pour voir si du contenu est chargé
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Vérifier si la hauteur de la page a changé (= chargement de contenu supplémentaire)
      return document.body.scrollHeight > initialHeight;
    });

    if (isInfiniteScroll) {
      console.log(
        "Scroll infini détecté, chargement de contenu supplémentaire...",
      );

      // Faire défiler la page progressivement pour charger plus de contenu
      await page.evaluate(async () => {
        // Nombre maximum d'itérations de scroll pour éviter une boucle infinie
        const MAX_SCROLLS = 5;

        for (let i = 0; i < MAX_SCROLLS; i++) {
          const previousHeight = document.body.scrollHeight;

          // Scroll par paliers
          window.scrollTo(
            0,
            document.body.scrollHeight * ((i + 1) / MAX_SCROLLS),
          );

          // Attendre le chargement
          await new Promise((resolve) => setTimeout(resolve, 800));

          // Si la hauteur n'a pas ou peu changé, arrêter
          if (document.body.scrollHeight - previousHeight < 100) {
            break;
          }
        }

        // Revenir en haut de la page
        window.scrollTo(0, 0);
      });

      // Attendre que tout soit chargé
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 3. Assurer que les transitions de page sont terminées (SPA, etc.)
    await page.evaluate(async () => {
      // Vérifier les éléments qui pourraient indiquer des transitions de page
      const transitionSelectors = [
        ".page-transition",
        ".transition-group",
        ".fade-enter",
        ".fade-enter-active",
        ".slide-in",
        ".slide-out",
        '[class*="transition"]',
        '[class*="pageTransition"]',
      ];

      const transitionElements = document.querySelectorAll(
        transitionSelectors.join(","),
      );

      if (transitionElements.length > 0) {
        // Si des éléments de transition sont présents, attendre leur disparition
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });
  } catch (error) {
    console.error("Erreur lors de la gestion des animations:", error);
    // Continuer en cas d'erreur
  }
}

/**
 * Extracts site structure including menus, sections, colors and fonts
 */
async function extractSiteStructure(
  page: Page,
): Promise<WebsiteContent["structure"]> {
  return await page.evaluate(() => {
    const structure: {
      menu: Array<{ text: string; url: string }>;
      sections: Array<{
        title?: string;
        content?: string;
        type: string;
        headingCount?: number;
        imageCount?: number;
        paragraphCount?: number;
        className?: string;
        id?: string;
      }>;
      colors: string[];
      fonts: string[];
      buttons: Array<{ text: string; style: string }>;
      layout: {
        header: boolean;
        footer: boolean;
        sidebar: boolean;
        mainContent?: string;
        gridColumns?: number;
        flexDirection?: string;
        responsive?: boolean;
        mainContentStructure: {
          width: string | null;
          maxWidth: string | null;
          padding: string | null;
          margin: string | null;
          centeringStrategy: string | null;
          gap: string | null;
          columnCount: number | null;
          rowCount: number | null;
          columnWidths?: string[];
          gridPattern?: string;
          columnGap?: string;
        };
        responsiveDetails?: {
          mediaQueriesCount: number;
          hasViewportMeta: boolean;
          usesFlexibleUnits: boolean;
          breakpoints: string[];
        };
      };
      domTreeDepth?: number;
      cta?: Array<{ text: string; url?: string; style?: string }>;
      imageStyles?: Array<{ style: string; count: number }>;
      spacingPattern?: string;
      cssVariables?: Record<string, string>;
      fontSources?: Array<string>;
      visualPatterns?: {
        cardPatterns: Array<{
          selector: string;
          count: number;
          structure: {
            hasImage: boolean;
            hasTitle: boolean;
            hasText: boolean;
            hasButton: boolean;
          };
        }>;
        visualHierarchy: {
          hasSeparators: boolean;
          usesDifferentBackgrounds: boolean;
          usesShadowsForDepth: boolean;
          usesTypographicHierarchy: boolean;
        };
        contentContainersCount: number;
        hasAlternatingRows: boolean;
      };
    } = {
      menu: [],
      sections: [],
      colors: [],
      fonts: [],
      buttons: [],
      layout: {
        header: false,
        footer: false,
        sidebar: false,
        mainContent: undefined,
        mainContentStructure: {
          width: null,
          maxWidth: null,
          padding: null,
          margin: null,
          centeringStrategy: null,
          gap: null,
          columnCount: null,
          rowCount: null,
          columnWidths: undefined,
          gridPattern: undefined,
          columnGap: undefined,
        },
        responsiveDetails: {
          mediaQueriesCount: 0,
          hasViewportMeta: false,
          usesFlexibleUnits: false,
          breakpoints: [],
        },
      },
    };

    // Extract menu items
    const menuElements = Array.from(
      document.querySelectorAll(
        "nav a, header a, .menu a, .navigation a, [role='navigation'] a, .navbar a, .header a",
      ),
    );
    structure.menu = menuElements
      .map((el) => {
        const element = el as HTMLAnchorElement;
        return {
          text: element.textContent?.trim() || "",
          url: element.href || "#",
        };
      })
      .filter((item) => item.text.length > 0);

    // Extract main sections (header, main, footer, sections, articles)
    const sectionElements = [
      ...Array.from(document.querySelectorAll("header, [role='banner']")).map(
        (el) => ({
          element: el,
          type: "header",
        }),
      ),
      ...Array.from(document.querySelectorAll("main, [role='main']")).map(
        (el) => ({
          element: el,
          type: "main",
        }),
      ),
      ...Array.from(document.querySelectorAll("section")).map((el) => ({
        element: el,
        type: "section",
      })),
      ...Array.from(document.querySelectorAll("article")).map((el) => ({
        element: el,
        type: "article",
      })),
      ...Array.from(
        document.querySelectorAll("footer, [role='contentinfo']"),
      ).map((el) => ({
        element: el,
        type: "footer",
      })),
    ];

    structure.sections = sectionElements.map((item) => {
      const headings = item.element.querySelectorAll("h1, h2, h3, h4, h5, h6");
      const images = item.element.querySelectorAll("img");
      const paragraphs = item.element.querySelectorAll("p");

      const section = {
        title:
          item.element.querySelector("h1, h2, h3")?.textContent?.trim() ||
          undefined,
        content:
          item.element.textContent?.trim().substring(0, 200) || undefined,
        type: item.type,
        headingCount: headings.length,
        imageCount: images.length,
        paragraphCount: paragraphs.length,
        className: item.element.className || "",
        id: item.element.id || "",
      };
      return section;
    });

    // Detect overall layout structure
    structure.layout.header = !!document.querySelector(
      "header, [role='banner']",
    );
    structure.layout.footer = !!document.querySelector(
      "footer, [role='contentinfo']",
    );
    structure.layout.sidebar = !!document.querySelector(
      "aside, .sidebar, [role='complementary']",
    );

    // Analyse améliorée de la structure du contenu principal
    const mainElements = [
      document.querySelector("main, [role='main']"),
      document.querySelector(".main-content, .content, #content, #main"),
      document.querySelector("article:first-of-type"),
    ].filter(Boolean);

    const mainElement = mainElements[0]; // Prendre le premier élément trouvé

    // Structure de base du layout
    structure.layout.mainContentStructure = {
      width: null,
      maxWidth: null,
      padding: null,
      margin: null,
      centeringStrategy: null,
      gap: null,
      columnCount: null,
      rowCount: null,
      columnWidths: undefined,
      gridPattern: undefined,
      columnGap: undefined,
    };

    if (mainElement) {
      // Count children to determine if it's a grid, flex, or standard layout
      const mainChildren = mainElement.children;
      const childrenCount = mainChildren.length;
      const mainStyle = window.getComputedStyle(mainElement);

      // Capturer les dimensions et le positionnement
      structure.layout.mainContentStructure.width = mainStyle.width;
      structure.layout.mainContentStructure.maxWidth = mainStyle.maxWidth;
      structure.layout.mainContentStructure.padding = mainStyle.padding;
      structure.layout.mainContentStructure.margin = mainStyle.margin;

      // Déterminer la stratégie de centrage
      if (
        mainStyle.margin === "0px auto" ||
        mainStyle.margin.includes("auto")
      ) {
        structure.layout.mainContentStructure.centeringStrategy = "margin-auto";
      } else if (
        mainStyle.position === "absolute" &&
        mainStyle.left === "50%" &&
        (mainStyle.transform.includes("translateX(-50%)") ||
          mainStyle.transform.includes("translate(-50%"))
      ) {
        structure.layout.mainContentStructure.centeringStrategy =
          "absolute-transform";
      } else if (
        mainElement.parentElement &&
        window.getComputedStyle(mainElement.parentElement).display === "flex" &&
        window
          .getComputedStyle(mainElement.parentElement)
          .justifyContent.includes("center")
      ) {
        structure.layout.mainContentStructure.centeringStrategy = "flex-center";
      }

      // Analyse détaillée du layout
      if (childrenCount >= 3) {
        // Check if it might be a grid/card layout
        const firstChild = mainChildren[0];
        const sameTagCount = Array.from(mainChildren).filter(
          (el) => el.tagName === firstChild.tagName,
        ).length;

        if (sameTagCount / childrenCount > 0.7) {
          // If more than 70% of children have the same tag, likely a grid/list
          structure.layout.mainContent = "grid";
        }
      }

      // Check for flex layout indicators
      if (mainStyle.display === "flex") {
        structure.layout.mainContent = "flex";
        structure.layout.flexDirection = mainStyle.flexDirection;
        structure.layout.mainContentStructure.gap =
          mainStyle.gap || mainStyle.columnGap;

        // Analyser les enfants du flex pour déterminer le modèle
        const childStyles = Array.from(mainChildren).map((child) =>
          window.getComputedStyle(child),
        );
        const flexBasisValues = childStyles
          .map((style) => style.flexBasis)
          .filter((basis) => basis !== "auto");
        const flexBasisSet = new Set(flexBasisValues);

        if (flexBasisSet.size > 0) {
          structure.layout.mainContentStructure.columnWidths =
            Array.from(flexBasisSet);
        }
      } else if (mainStyle.display === "grid") {
        structure.layout.mainContent = "grid";
        const columns = mainStyle.gridTemplateColumns
          .split(" ")
          .filter(Boolean);
        structure.layout.gridColumns = columns.length;
        structure.layout.mainContentStructure.columnCount = columns.length;
        structure.layout.mainContentStructure.gap =
          mainStyle.gap || mainStyle.gridGap;

        // Analyser les motifs de grille
        if (columns.length > 0) {
          const uniqueColumns = Array.from(new Set(columns));
          structure.layout.mainContentStructure.gridPattern =
            uniqueColumns.join(" ");
        }

        // Essayer de déterminer le nombre de lignes
        const rows = mainStyle.gridTemplateRows.split(" ").filter(Boolean);
        if (rows.length > 0) {
          structure.layout.mainContentStructure.rowCount = rows.length;
        } else if (childrenCount > 0 && structure.layout.gridColumns > 0) {
          // Estimer le nombre de lignes basé sur le nombre d'enfants et de colonnes
          structure.layout.mainContentStructure.rowCount = Math.ceil(
            childrenCount / structure.layout.gridColumns,
          );
        }
      } else if (!structure.layout.mainContent) {
        structure.layout.mainContent = "standard";
      }

      // Détection de mise en page responsive en colonnes
      if (mainStyle.columnCount && mainStyle.columnCount !== "auto") {
        structure.layout.mainContent = "multi-column";
        structure.layout.mainContentStructure.columnCount = parseInt(
          mainStyle.columnCount,
        );
        structure.layout.mainContentStructure.columnGap = mainStyle.columnGap;
      }

      // Détection améliorée du responsive design
      const responsiveIndicators = {
        mediaQueries: 0,
        viewportMeta: false,
        flexibleUnits: false,
        breakpoints: new Set<string>(),
      };

      // Compte les media queries
      try {
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            if (!sheet.cssRules) return;

            Array.from(sheet.cssRules).forEach((rule) => {
              if (rule.type === CSSRule.MEDIA_RULE) {
                responsiveIndicators.mediaQueries++;

                // Extraire les breakpoints
                const mediaRule = rule as CSSMediaRule;
                const mediaText = mediaRule.media.mediaText.toLowerCase();

                if (
                  mediaText.includes("max-width") ||
                  mediaText.includes("min-width")
                ) {
                  responsiveIndicators.breakpoints.add(mediaText);
                }
              }
            });
          } catch {
            // Ignorer les erreurs d'accès aux feuilles de style
          }
        });
      } catch {
        // Ignorer les erreurs générales
      }

      // Vérifier la présence de meta viewport
      responsiveIndicators.viewportMeta = !!document.querySelector(
        'meta[name="viewport"]',
      );

      // Vérifier l'utilisation d'unités flexibles (%, em, rem, vh, vw)
      const flexibleUnitsRegex = /\d+(em|rem|%|vh|vw|vmin|vmax)/;
      try {
        // Échantilloner quelques éléments pour les unités flexibles
        const sampleElements = [
          document.body,
          mainElement,
          document.querySelector("header"),
          document.querySelector(".container, .wrapper, .content"),
        ].filter((el): el is Element => el !== null);

        for (const element of sampleElements) {
          const style = window.getComputedStyle(element);
          if (
            flexibleUnitsRegex.test(style.width) ||
            flexibleUnitsRegex.test(style.maxWidth) ||
            style.width === "auto" ||
            style.width.includes("%")
          ) {
            responsiveIndicators.flexibleUnits = true;
            break;
          }
        }
      } catch {
        // Ignorer les erreurs
      }

      // Déterminer si le site est responsive
      structure.layout.responsive =
        responsiveIndicators.mediaQueries > 0 ||
        (responsiveIndicators.viewportMeta &&
          responsiveIndicators.flexibleUnits);

      // Ajouter des informations détaillées sur le responsive
      structure.layout.responsiveDetails = {
        mediaQueriesCount: responsiveIndicators.mediaQueries,
        hasViewportMeta: responsiveIndicators.viewportMeta,
        usesFlexibleUnits: responsiveIndicators.flexibleUnits,
        breakpoints: Array.from(responsiveIndicators.breakpoints).slice(0, 5),
      };
    }

    // Extract calls-to-action
    const ctaElements = document.querySelectorAll(
      'a.cta, button.cta, .btn-primary, a[class*="cta"], [class*="btn-primary"], a.button, a.btn',
    );

    structure.cta = Array.from(ctaElements)
      .slice(0, 5)
      .map((el) => {
        const style = window.getComputedStyle(el);
        return {
          text: el.textContent?.trim() || "",
          url: el instanceof HTMLAnchorElement ? el.href : undefined,
          style: `bg:${style.backgroundColor}, color:${style.color}, radius:${style.borderRadius}`,
        };
      })
      .filter((cta) => cta.text);

    // Extract colors by getting all computed styles
    const allElements = document.querySelectorAll("*");
    const colorSet = new Set<string>();

    allElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bgColor = style.backgroundColor;

      if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
        colorSet.add(color);
      }

      if (
        bgColor &&
        bgColor !== "rgba(0, 0, 0, 0)" &&
        bgColor !== "transparent"
      ) {
        colorSet.add(bgColor);
      }
    });

    // Only keep the first 10 colors
    structure.colors = Array.from(colorSet).slice(0, 10);

    // Extraction améliorée des polices
    const fontSet = new Set<string>();
    const fontUrlSet = new Set<string>(); // Pour stocker les URLs des polices externes

    // Capture des déclarations de familles de polices dans les styles calculés
    allElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const fontFamily = style.fontFamily;
      if (fontFamily && fontFamily !== "") {
        fontSet.add(fontFamily);
      }
    });

    // Capture des imports/faces de polices depuis les feuilles de style
    try {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          if (!sheet.cssRules) return; // Ignore les feuilles de style inaccessibles (CORS)

          Array.from(sheet.cssRules).forEach((rule) => {
            // Capture @font-face
            if (rule.type === CSSRule.FONT_FACE_RULE) {
              const fontFaceRule = rule as CSSFontFaceRule;
              const fontFamily = fontFaceRule.style
                .getPropertyValue("font-family")
                .replace(/['"]/g, "");
              const fontSrc = fontFaceRule.style.getPropertyValue("src");

              if (fontFamily) fontSet.add(fontFamily);

              // Extraire URLs des sources de polices
              const urlMatches = fontSrc.match(/url\(['"]?(.*?)['"]?\)/g);
              if (urlMatches) {
                urlMatches.forEach((match) => {
                  const url = match.replace(/url\(['"]?(.*?)['"]?\)/, "$1");
                  if (url) fontUrlSet.add(url);
                });
              }
            }

            // Capture @import pour les polices (comme Google Fonts)
            if (rule.type === CSSRule.IMPORT_RULE) {
              const importRule = rule as CSSImportRule;
              const importUrl = importRule.href;

              if (
                importUrl &&
                (importUrl.includes("fonts.googleapis.com") ||
                  importUrl.includes("fonts.gstatic.com") ||
                  importUrl.includes("font") ||
                  importUrl.includes(".woff") ||
                  importUrl.includes(".ttf") ||
                  importUrl.includes(".otf"))
              ) {
                fontUrlSet.add(importUrl);
              }
            }
          });
        } catch {
          // Ignorer les erreurs d'accès aux feuilles de style
        }
      });
    } catch {
      // Ignorer les erreurs générales d'accès aux feuilles de style
    }

    // Combiner les polices et les sources
    structure.fonts = Array.from(fontSet).slice(0, 10);

    // Ajouter les sources de polices comme propriété supplémentaire
    structure.fontSources = Array.from(fontUrlSet).slice(0, 15);

    // Extract image styles
    const imageStyleMap = new Map<string, number>();
    document.querySelectorAll("img").forEach((img) => {
      const style = window.getComputedStyle(img);
      const styleKey = `border:${style.border}, radius:${style.borderRadius}, shadow:${style.boxShadow}`;
      imageStyleMap.set(styleKey, (imageStyleMap.get(styleKey) || 0) + 1);
    });

    structure.imageStyles = Array.from(imageStyleMap.entries())
      .map(([style, count]) => ({ style, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Extract buttons
    const buttons = document.querySelectorAll(
      "button, .btn, .button, [role='button'], a.btn, a.button",
    );
    structure.buttons = Array.from(buttons)
      .slice(0, 10)
      .map((btn) => {
        const style = window.getComputedStyle(btn);
        return {
          text: btn.textContent?.trim() || "",
          style: `bg:${style.backgroundColor}, color:${style.color}, radius:${style.borderRadius}, padding:${style.padding}, font:${style.fontFamily}, weight:${style.fontWeight}`,
        };
      })
      .filter((btn) => btn.text);

    // Extract CSS variables for color schemes
    structure.cssVariables = {};
    const rootStyle = window.getComputedStyle(document.documentElement);
    for (let i = 0; i < rootStyle.length; i++) {
      const prop = rootStyle[i];
      if (prop.startsWith("--")) {
        structure.cssVariables[prop] = rootStyle.getPropertyValue(prop).trim();
      }
    }

    // Analyze spacing patterns
    const spacings = Array.from(allElements).map((el) => {
      const style = window.getComputedStyle(el);
      return {
        margin: style.margin,
        padding: style.padding,
      };
    });

    // Simplistic spacing pattern detection
    const commonSpacings: Record<string, number> = {};
    spacings.forEach((s) => {
      if (s.margin && s.margin !== "0px") {
        commonSpacings[s.margin] = (commonSpacings[s.margin] || 0) + 1;
      }
      if (s.padding && s.padding !== "0px") {
        commonSpacings[s.padding] = (commonSpacings[s.padding] || 0) + 1;
      }
    });

    const mostCommonSpacings = Object.entries(commonSpacings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((entry) => entry[0])
      .join(", ");

    structure.spacingPattern =
      mostCommonSpacings || "No consistent spacing pattern detected";

    // Calculate DOM tree depth to understand complexity
    function getMaxDepth(element: Element, currentDepth = 0): number {
      if (!element.children || element.children.length === 0) {
        return currentDepth;
      }

      let maxChildDepth = currentDepth;
      for (let i = 0; i < element.children.length; i++) {
        const childDepth = getMaxDepth(element.children[i], currentDepth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }

      return maxChildDepth;
    }

    structure.domTreeDepth = getMaxDepth(document.body);

    // Analyser les patterns visuels et les relations entre éléments
    try {
      // Identifier les patterns de répétition dans le contenu
      const contentContainers = document.querySelectorAll(
        "main section, .content section, main .row, main article, main .card, main .block, .container > div",
      );

      // Analyser les "card patterns" (motifs de cartes répétitives)
      const cardPatterns: Array<{
        selector: string;
        count: number;
        structure: {
          hasImage: boolean;
          hasTitle: boolean;
          hasText: boolean;
          hasButton: boolean;
        };
      }> = [];

      const cardSelectors = [
        ".card",
        ".product",
        ".item",
        ".post",
        ".box",
        '[class*="card"]',
        '[class*="product"]',
        '[class*="item"]',
      ];

      for (const selector of cardSelectors) {
        const cards = document.querySelectorAll(selector);
        if (cards.length >= 3) {
          // Analyser la structure similaire des cartes
          const firstCard = cards[0];
          const hasImage = !!firstCard.querySelector("img");
          const hasTitle = !!firstCard.querySelector("h1, h2, h3, h4, h5, h6");
          const hasText = !!firstCard.querySelector("p");
          const hasButton = !!firstCard.querySelector(
            "button, .btn, .button, a.btn, a.button",
          );

          cardPatterns.push({
            selector,
            count: cards.length,
            structure: {
              hasImage,
              hasTitle,
              hasText,
              hasButton,
            },
          });
        }
      }

      // Analyser les séparateurs et diviseurs
      const separators = document.querySelectorAll("hr, .divider, .separator");
      const hasSeparators = separators.length > 0;

      // Analyser les indicateurs de hiérarchie visuelle
      const visualHierarchy = {
        hasSeparators,
        usesDifferentBackgrounds: false,
        usesShadowsForDepth: false,
        usesTypographicHierarchy: false,
      };

      // Vérifier différentes couleurs de fond pour sections
      const sections = document.querySelectorAll('section, [class*="section"]');
      const sectionBgColors = new Set<string>();

      sections.forEach((section) => {
        const bgColor = window.getComputedStyle(section).backgroundColor;
        if (
          bgColor &&
          bgColor !== "rgba(0, 0, 0, 0)" &&
          bgColor !== "transparent"
        ) {
          sectionBgColors.add(bgColor);
        }
      });

      visualHierarchy.usesDifferentBackgrounds = sectionBgColors.size > 1;

      // Vérifier l'utilisation d'ombres pour profondeur
      const elementsWithShadow = document.querySelectorAll(
        '.card, .box, [class*="shadow"], [style*="box-shadow"]',
      );
      visualHierarchy.usesShadowsForDepth = elementsWithShadow.length > 3;

      // Vérifier hiérarchie typographique
      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      const headingSizes = new Set<string>();

      headings.forEach((heading) => {
        const fontSize = window.getComputedStyle(heading).fontSize;
        if (fontSize) {
          headingSizes.add(fontSize);
        }
      });

      visualHierarchy.usesTypographicHierarchy = headingSizes.size >= 3;

      // Ajouter les résultats à la structure
      structure.visualPatterns = {
        cardPatterns: cardPatterns.slice(0, 3), // Limiter à 3 patterns pour éviter des données trop volumineuses
        visualHierarchy,
        contentContainersCount: contentContainers.length,
        hasAlternatingRows:
          document.querySelectorAll('.odd, .even, [class*="alternate"]')
            .length > 0,
      };
    } catch {
      // Ignorer les erreurs dans l'analyse des patterns visuels
    }

    return structure;
  });
}

/**
 * Extract meta tags from the page
 */
async function extractMetaTags(page: Page): Promise<Record<string, string>> {
  return await page.evaluate(() => {
    const metaTags: Record<string, string> = {};
    const tags = document.querySelectorAll("meta");

    tags.forEach((tag) => {
      const name = tag.getAttribute("name") || tag.getAttribute("property");
      const content = tag.getAttribute("content");

      if (name && content) {
        metaTags[name] = content;
      }
    });

    return metaTags;
  });
}

/**
 * Détecte et attend la disparition des loaders/spinners courants sur les sites web
 */
async function waitForLoaderToDisappear(page: Page): Promise<void> {
  const commonLoaderSelectors = [
    // Sélecteurs courants pour les loaders
    "#loader",
    ".loader",
    "#loading",
    ".loading",
    ".spinner",
    "#spinner",
    '[role="progressbar"]',
    ".preloader",
    "#preloader",
    ".page-loader",
    "#page-loader",
    ".loading-overlay",
    ".loader-wrapper",
    // Classes spécifiques courantes
    '[class*="loader"]',
    '[class*="loading"]',
    '[class*="spinner"]',
    '[class*="preload"]',
    '[id*="loader"]',
    '[id*="loading"]',
    // Éléments avec animations
    ".animate-spin",
    '[class*="animate"]',
    '[class*="rotate"]',
    // Overlays
    ".overlay",
    ".modal-backdrop",
    ".page-transition",
  ];

  try {
    // Vérifier si des loaders sont présents
    const hasLoader = await page.evaluate((selectors) => {
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          // Vérifier si l'élément est visible
          const style = window.getComputedStyle(el);
          const isVisible =
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            (el as HTMLElement).offsetWidth > 0 &&
            (el as HTMLElement).offsetHeight > 0;

          if (isVisible) return true;
        }
      }
      return false;
    }, commonLoaderSelectors);

    if (hasLoader) {
      console.log("Loader détecté, attente en cours...");

      // Option 1: Attendre un délai fixe supplémentaire
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Option 2: Attendre la disparition des loaders (jusqu'à 10 secondes max)
      const startTime = Date.now();
      const maxWaitTime = 10000; // 10 secondes max

      while (Date.now() - startTime < maxWaitTime) {
        // Vérifier à nouveau si le loader est encore visible
        const loaderStillVisible = await page.evaluate((selectors) => {
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of Array.from(elements)) {
              const style = window.getComputedStyle(el);
              const isVisible =
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                style.opacity !== "0" &&
                (el as HTMLElement).offsetWidth > 0 &&
                (el as HTMLElement).offsetHeight > 0;

              if (isVisible) return true;
            }
          }
          return false;
        }, commonLoaderSelectors);

        if (!loaderStillVisible) {
          console.log("Loader disparu, continuer le scraping...");
          break;
        }

        // Attendre un peu avant de revérifier
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Attendre que le réseau soit à nouveau inactif après la disparition du loader
      await page
        .waitForNetworkIdle({ idleTime: 1000, timeout: 5000 })
        .catch(() => {
          console.log("Timeout lors de l'attente du network idle après loader");
        });
    }
  } catch (error) {
    console.log("Erreur lors de la détection du loader:", error);
    // Continuer même en cas d'erreur
  }
}

/**
 * Scrapes a website and returns its content including HTML and images
 */
export async function scrapeWebsite(
  url: string,
  options?: { fullPage?: boolean },
): Promise<WebsiteContent> {
  // Determine if running on Windows
  const isWindows = process.platform === "win32";

  // Get executable path
  let executablePath;
  if (isWindows) {
    // Try to find Chrome/Edge on Windows
    executablePath = (await findChromePath()) || "chrome.exe";
  } else {
    executablePath = await chromium.executablePath();
  }

  // Setup browser launch options
  const browserOptions = {
    args: [
      ...chromium.args,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
  };

  let browser;
  try {
    // Attempt to launch browser
    browser = await puppeteer.launch(browserOptions);

    const page = await browser.newPage();

    // Set a common user agent to appear more like a regular browser
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    );

    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Set extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "sec-ch-ua": '"Not.A/Brand";v="8", "Chromium";v="123"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    });

    // Mask WebDriver usage
    await page.evaluateOnNewDocument(() => {
      // Hide webdriver and automation indicators
      Object.defineProperty(navigator, "webdriver", { get: () => false });

      // Delete navigator.plugins
      if (navigator.plugins) {
        Object.defineProperty(navigator, "plugins", {
          get: () => [
            {
              0: { type: "application/x-google-chrome-pdf" },
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              name: "Chrome PDF Viewer",
              length: 1,
            },
          ],
        });
      }

      // Add some common Chrome functions to appear more like a real Chrome browser
      window.chrome = {
        runtime: {},
      };

      // Overwrite the permissions API if present
      if (navigator.permissions) {
        navigator.permissions.query = (parameters) =>
          Promise.resolve({
            state: parameters.name === "notifications" ? "prompt" : "granted",
            name: parameters.name,
            onchange: null,
            addEventListener: function () {},
            removeEventListener: function () {},
            dispatchEvent: function () {
              return true;
            },
          } as PermissionStatus);
      }
    });

    // Set timeout for navigation
    await page.setDefaultNavigationTimeout(30000);

    // Navigate to the URL with extra options to avoid detection
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Attendre la fin des loaders initiaux
    await waitForLoaderToDisappear(page);

    // Vérifier si la page continue à charger du contenu dynamiquement
    await waitForDynamicContentToLoad(page);

    // Détecter et gérer les animations de chargement et le scroll infini
    await handleLoadingAnimationsAndInfiniteScroll(page);

    // Check if the page contains common Cloudflare challenge elements
    const isChallengePresent = await page.evaluate(() => {
      return (
        document.querySelector(
          "#cf-challenge-running, .cf-browser-verification, .cf-error-code",
        ) !== null
      );
    });

    // If a Cloudflare challenge is detected, try waiting a bit longer
    if (isChallengePresent) {
      console.log("Cloudflare challenge detected. Waiting to solve...");
      // Wait for up to 15 seconds to see if the challenge resolves
      await page
        .waitForNavigation({
          waitUntil: "networkidle2",
          timeout: 15000,
        })
        .catch(() => console.log("Challenge timeout exceeded"));
    }

    // Get page title and description
    const title = await page.title();
    const description = await page.evaluate(() => {
      const metaDescription = document.querySelector(
        'meta[name="description"]',
      );
      return metaDescription ? metaDescription.getAttribute("content") : "";
    });

    // Get HTML content
    const html = await page.content();

    // Extract all images with their URLs and alt texts
    const images = await page.evaluate(() => {
      // Helper to extract background images from computed style
      const extractBackgroundImage = (
        style: CSSStyleDeclaration,
      ): string | null => {
        const bgImage = style.backgroundImage;
        if (!bgImage || bgImage === "none") return null;

        // Check if it's a gradient (we can't use these directly)
        if (bgImage.includes("gradient")) {
          // If it's a multi-layered background with both gradient and image, try to extract the image URL
          if (bgImage.includes("url(")) {
            const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
            return urlMatch ? urlMatch[1] : null;
          }
          // Pure gradient, not an image we can use
          return null;
        }

        // Handle multiple background images (comma-separated)
        if (bgImage.includes(",")) {
          // Extract all URLs and return the first valid one
          const allUrls = bgImage
            .split(",")
            .map((part) => {
              const match = part.trim().match(/url\(['"]?(.*?)['"]?\)/);
              return match ? match[1] : null;
            })
            .filter(Boolean);

          return allUrls.length > 0 ? allUrls[0] : null;
        }

        // Standard single background image
        const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : null;
      };

      // Get regular img tags
      const imgElements = Array.from(document.querySelectorAll("img"));
      const imgData = imgElements
        .map((img) => {
          const computedStyle = window.getComputedStyle(img);
          const rect = img.getBoundingClientRect();
          const isVisible =
            rect.width > 1 &&
            rect.height > 1 &&
            computedStyle.display !== "none" &&
            computedStyle.visibility !== "hidden" &&
            computedStyle.opacity !== "0";

          return {
            url: img.src,
            alt: img.alt || "",
            dimensions:
              img.width && img.height
                ? { width: img.width, height: img.height }
                : undefined,
            isVisible,
            role: img.getAttribute("role") || undefined,
            className: img.className || undefined,
            inViewport: rect.top < window.innerHeight && rect.bottom > 0,
            lazyLoaded:
              img.loading === "lazy" || img.getAttribute("data-src") !== null,
            style: {
              border: computedStyle.border,
              borderRadius: computedStyle.borderRadius,
              boxShadow: computedStyle.boxShadow,
              filter: computedStyle.filter,
            },
          };
        })
        .filter(
          (img) =>
            img.url &&
            !img.url.startsWith("data:") &&
            !img.url.includes("placeholder"),
        );

      // Get background images from elements that may have them (étendu pour capturer plus d'éléments)
      const bgElements = document.querySelectorAll(
        'header, section, article, div, span, a, li, button, nav, main, aside, footer, [style*="background"], [class*="banner"], [class*="hero"], [class*="background"], [class*="bg-"], .background, .bg, [style*="background-image"]',
      );

      const bgImagesData = Array.from(bgElements)
        .map((el) => {
          const computedStyle = window.getComputedStyle(el);
          const bgUrl = extractBackgroundImage(computedStyle);

          if (!bgUrl) return null;

          const rect = el.getBoundingClientRect();
          return {
            url: bgUrl,
            alt:
              el.getAttribute("aria-label") || el.getAttribute("title") || "",
            dimensions: { width: rect.width, height: rect.height },
            isVisible:
              rect.width > 1 &&
              rect.height > 1 &&
              computedStyle.display !== "none" &&
              computedStyle.visibility !== "hidden",
            type: "background",
            className: el.className || undefined,
            inViewport: rect.top < window.innerHeight && rect.bottom > 0,
            isHero:
              el.classList.contains("hero") ||
              el.classList.contains("banner") ||
              (el.tagName === "HEADER" && rect.top < 200),
            style: {
              backgroundSize: computedStyle.backgroundSize,
              backgroundPosition: computedStyle.backgroundPosition,
              backgroundRepeat: computedStyle.backgroundRepeat,
              filter: computedStyle.filter,
            },
          };
        })
        .filter(
          (item): item is NonNullable<typeof item> =>
            item !== null && !!item.url && !item.url.includes("placeholder"),
        );

      // Filter out duplicates and improve URL handling
      const seenUrls = new Set<string>();
      const allImages = [...imgData, ...bgImagesData].filter((img) => {
        // Skip if no URL or has invalid URL
        if (!img.url) return false;

        // Try to resolve relative URLs correctly
        if (img.url.startsWith("/") && !img.url.startsWith("//")) {
          try {
            img.url = new URL(img.url, window.location.origin).toString();
          } catch {
            // If URL construction fails, keep original URL
          }
        }

        // Normalize URLs with protocol-relative paths
        if (img.url.startsWith("//")) {
          img.url = window.location.protocol + img.url;
        }

        // Skip data URLs and placeholder images
        if (
          img.url.startsWith("data:") ||
          img.url.includes("placeholder") ||
          img.url.includes("spacer.gif") ||
          img.url.includes("blank.gif")
        ) {
          return false;
        }

        // Skip duplicates
        const normalizedUrl = img.url.split("?")[0]; // Remove query parameters
        if (seenUrls.has(normalizedUrl)) return false;
        seenUrls.add(normalizedUrl);

        return true;
      });

      return allImages;
    });

    // Capture screenshot if requested
    let screenshot = undefined;
    const sectionScreenshots: Record<string, string> = {};

    if (options?.fullPage) {
      // Retourner au début de la page avant de prendre la capture d'écran
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });

      // Attendre un court délai pour s'assurer que tout est bien visible
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Capture full page screenshot avec une meilleure qualité
      screenshot = (await page.screenshot({
        fullPage: true,
        encoding: "base64",
        type: "jpeg",
        quality: 90, // Qualité améliorée pour mieux voir les détails
      })) as string;

      // Capture screenshots of important sections
      const sectionsToCapture = await page.evaluate(() => {
        const sections = [
          // Header
          document.querySelector("header"),
          // Hero section
          document.querySelector(
            '.hero, .banner, [class*="hero"], [class*="banner"]',
          ),
          // Main content
          document.querySelector('main, [role="main"]'),
          // Footer
          document.querySelector("footer"),
        ].filter((el) => el !== null);

        return sections.map((section) => {
          const rect = section.getBoundingClientRect();
          const id = section.id || "";
          const className = section.className || "";
          const tagName = section.tagName.toLowerCase();

          return {
            id,
            className,
            tagName,
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
          };
        });
      });

      for (const section of sectionsToCapture) {
        const key = section.id || section.className || section.tagName;
        sectionScreenshots[key] = (await page.screenshot({
          clip: section.rect,
          encoding: "base64",
          type: "jpeg",
          quality: 80,
        })) as string;
      }
    }

    // Extract CSS stylesheets content for better cloning
    const cssContent = await page.evaluate(() => {
      const cssRules: string[] = [];
      try {
        // Collect all stylesheets content
        for (let i = 0; i < document.styleSheets.length; i++) {
          try {
            const sheet = document.styleSheets[i];
            // Skip external stylesheets we can't access due to CORS
            if (!sheet.cssRules) continue;

            for (let j = 0; j < sheet.cssRules.length; j++) {
              const rule = sheet.cssRules[j];

              // Focus on important rules for structural elements and layout
              if (
                rule.cssText &&
                // Target layout and structural selectors
                (rule.cssText.includes("header") ||
                  rule.cssText.includes("footer") ||
                  rule.cssText.includes("section") ||
                  rule.cssText.includes("main") ||
                  rule.cssText.includes("nav") ||
                  rule.cssText.includes("container") ||
                  rule.cssText.includes("wrapper") ||
                  // Target background-related properties
                  rule.cssText.includes("background") ||
                  // Target layout properties
                  rule.cssText.includes("display: grid") ||
                  rule.cssText.includes("display: flex") ||
                  rule.cssText.includes("grid-") ||
                  rule.cssText.includes("flex-") ||
                  // Target positioning
                  rule.cssText.includes("position: absolute") ||
                  rule.cssText.includes("position: relative") ||
                  rule.cssText.includes("position: fixed") ||
                  // Target important visual styling
                  rule.cssText.includes("box-shadow") ||
                  rule.cssText.includes("border-radius") ||
                  rule.cssText.includes("@media"))
              ) {
                cssRules.push(rule.cssText);
              }
            }
          } catch {
            // Skip inaccessible stylesheet
            continue;
          }
        }
      } catch {
        // Silent fail for CSS extraction errors
      }
      return cssRules;
    });

    // Extract website structure
    const structure = await extractSiteStructure(page);

    // Extract meta tags
    const metaTags = await extractMetaTags(page);

    return {
      html,
      images,
      title,
      description,
      url,
      structure,
      metaTags,
      screenshot,
      sectionScreenshots,
      cssContent,
    };
  } catch (error) {
    console.error("Error during Puppeteer website scraping:", error);

    // Check if the error message indicates Cloudflare or anti-bot protection
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (
      errorMsg.includes("cloudflare") ||
      errorMsg.includes("challenge") ||
      errorMsg.includes("captcha") ||
      errorMsg.includes("403") ||
      errorMsg.includes("blocked")
    ) {
      console.log(
        "Likely encountered anti-bot protection. Trying fallback method...",
      );
    }

    // Try fallback method
    console.log("Attempting fallback fetch method...");
    return fetchWebsiteContent(url);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
