import { JSDOM } from "jsdom";
import type { Page } from "puppeteer-core";

import { getBrowser } from "../capture-screenshot";

interface WebsiteContent {
  html: string;
  images: Array<{
    url: string;
    alt: string;
    dimensions?: { width: number; height: number };
    isVisible?: boolean;
  }>;
  videos?: Array<{
    url: string;
    type: string;
    provider?: string;
  }>;
  title: string;
  description: string | null;
  url: string;
  screenshot?: string;
  metaTags?: Record<string, string>;
  structure?: {
    menu?: Array<{ text: string; url: string }>;
    sections?: Array<{
      title?: string;
      content?: string;
      type: string;
    }>;
    layout?: {
      header?: boolean;
      footer?: boolean;
      sidebar?: boolean;
      mainContent?: string;
    };
    colors?: Array<string>;
    fonts?: Array<string>;
  };
  htmlStructure?: {
    headTags: {
      title: string;
      favicons: string[];
      stylesheets: string[];
      scripts: string[];
      charset: string;
      viewportMeta: string | null;
    };
    bodyStructure: {
      classes: string;
      id: string;
      attributes: Array<{ name: string; value: string }>;
      childrenCount: number;
    };
    semanticElements: Record<
      string,
      {
        count: number;
        details: Array<{
          id: string;
          classes: string;
          childElementCount: number;
          textContent: string;
        }>;
      }
    >;
    domStats: {
      totalElements: number;
      divCount: number;
      spanCount: number;
      paragraphCount: number;
      imageCount: number;
      linkCount: number;
      buttonCount: number;
      formCount: number;
      tableCount: number;
      listCount: number;
    };
    mainContentHtml: string;
    significantElements: Array<{
      selector: string;
      count: number;
      sample: string;
    }>;
  };
}

async function fetchWebsiteContent(url: string): Promise<WebsiteContent> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (response.ok) {
      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const title = document.querySelector("title")?.textContent || url;
      const metaDescription = document.querySelector(
        'meta[name="description"]',
      );
      const description = metaDescription?.getAttribute("content") || null;

      const imgElements = document.querySelectorAll("img");
      const images = Array.from(imgElements)
        .map((element) => {
          const img = element as HTMLImageElement;
          const src = img.getAttribute("src") || "";
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
        videos: [],
        title,
        description,
        url,
      };
    } else {
      console.warn(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
      );
      return {
        html: "",
        images: [],
        videos: [],
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
      videos: [],
      title: url,
      description: `Failed to fetch website content`,
      url,
    };
  }
}

async function waitForDynamicContentToLoad(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const MAX_WAIT_TIME = 3000;
        setTimeout(resolve, MAX_WAIT_TIME);
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (error) {
    console.error("Error waiting for dynamic content:", error);
  }
}

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
      }>;
      colors: string[];
      fonts: string[];
      layout: {
        header: boolean;
        footer: boolean;
        sidebar: boolean;
        mainContent?: string;
      };
    } = {
      menu: [],
      sections: [],
      colors: [],
      fonts: [],
      layout: {
        header: false,
        footer: false,
        sidebar: false,
      },
    };

    const menuElements = Array.from(
      document.querySelectorAll(
        "nav a, header a, .menu a, .navigation a, [role='navigation'] a",
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

    const sectionElements = [
      ...Array.from(document.querySelectorAll("header")).map((el) => ({
        element: el,
        type: "header",
      })),
      ...Array.from(document.querySelectorAll("main")).map((el) => ({
        element: el,
        type: "main",
      })),
      ...Array.from(document.querySelectorAll("section")).map((el) => ({
        element: el,
        type: "section",
      })),
      ...Array.from(document.querySelectorAll("footer")).map((el) => ({
        element: el,
        type: "footer",
      })),
    ];

    structure.sections = sectionElements.map((item) => ({
      title:
        item.element.querySelector("h1, h2, h3")?.textContent?.trim() ||
        undefined,
      content: item.element.textContent?.trim().substring(0, 200) || undefined,
      type: item.type,
    }));

    structure.layout.header = !!document.querySelector("header");
    structure.layout.footer = !!document.querySelector("footer");
    structure.layout.sidebar = !!document.querySelector("aside, .sidebar");

    const mainElement = document.querySelector("main");
    if (mainElement) {
      const mainStyle = window.getComputedStyle(mainElement);
      if (mainStyle.display === "flex") {
        structure.layout.mainContent = "flex";
      } else if (mainStyle.display === "grid") {
        structure.layout.mainContent = "grid";
      } else {
        structure.layout.mainContent = "standard";
      }
    }

    const colorSet = new Set<string>();
    document
      .querySelectorAll("body, header, main, section, footer, h1, h2, h3, p, a")
      .forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.color && style.color !== "rgba(0, 0, 0, 0)") {
          colorSet.add(style.color);
        }
        if (
          style.backgroundColor &&
          style.backgroundColor !== "rgba(0, 0, 0, 0)"
        ) {
          colorSet.add(style.backgroundColor);
        }
      });
    structure.colors = Array.from(colorSet).slice(0, 5);

    const fontSet = new Set<string>();
    document.querySelectorAll("body, h1, h2, h3, p").forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.fontFamily) {
        fontSet.add(style.fontFamily);
      }
    });
    structure.fonts = Array.from(fontSet).slice(0, 3);

    return structure;
  });
}

async function extractMetaTags(page: Page): Promise<Record<string, string>> {
  return await page.evaluate(() => {
    const metaTags: Record<string, string> = {};
    document.querySelectorAll("meta").forEach((tag) => {
      const name = tag.getAttribute("name") || tag.getAttribute("property");
      const content = tag.getAttribute("content");
      if (name && content) {
        metaTags[name] = content;
      }
    });
    return metaTags;
  });
}

async function extractDetailedHtmlStructure(
  page: Page,
): Promise<WebsiteContent["htmlStructure"]> {
  return await page.evaluate(() => {
    // Extract semantic structure information
    const htmlStructure: WebsiteContent["htmlStructure"] = {
      headTags: {
        title: document.title,
        favicons: Array.from(document.querySelectorAll('link[rel*="icon"]'))
          .map((el) => el.getAttribute("href") || "")
          .filter((href) => href !== ""),
        stylesheets: Array.from(
          document.querySelectorAll('link[rel="stylesheet"]'),
        )
          .map((el) => el.getAttribute("href") || "")
          .filter((href) => href !== ""),
        scripts: Array.from(document.querySelectorAll("script[src]"))
          .map((el) => el.getAttribute("src") || "")
          .filter((src) => src !== ""),
        charset: document.characterSet,
        viewportMeta:
          document
            .querySelector('meta[name="viewport"]')
            ?.getAttribute("content") || null,
      },
      bodyStructure: {
        classes: document.body.className,
        id: document.body.id,
        attributes: Array.from(document.body.attributes).map((attr) => ({
          name: attr.name,
          value: attr.value,
        })),
        childrenCount: document.body.children.length,
      },
      semanticElements: {} as Record<
        string,
        {
          count: number;
          details: Array<{
            id: string;
            classes: string;
            childElementCount: number;
            textContent: string;
          }>;
        }
      >,
      domStats: {
        totalElements: document.querySelectorAll("*").length,
        divCount: document.querySelectorAll("div").length,
        spanCount: document.querySelectorAll("span").length,
        paragraphCount: document.querySelectorAll("p").length,
        imageCount: document.querySelectorAll("img").length,
        linkCount: document.querySelectorAll("a").length,
        buttonCount: document.querySelectorAll("button").length,
        formCount: document.querySelectorAll("form").length,
        tableCount: document.querySelectorAll("table").length,
        listCount: document.querySelectorAll("ul, ol").length,
      },
      mainContentHtml: "",
      significantElements: [],
    };

    // Extract semantic elements
    const semanticTags = [
      "header",
      "nav",
      "main",
      "article",
      "section",
      "aside",
      "footer",
    ];
    semanticTags.forEach((tag) => {
      const elements = document.querySelectorAll(tag);
      htmlStructure.semanticElements[tag] = {
        count: elements.length,
        details: Array.from(elements)
          .slice(0, 2)
          .map((el) => ({
            id: (el as HTMLElement).id,
            classes: (el as HTMLElement).className,
            childElementCount: el.childElementCount,
            textContent:
              (el as HTMLElement).textContent?.substring(0, 100).trim() || "",
          })),
      };
    });

    // Extract main content HTML (limited)
    const mainElement =
      document.querySelector("main") ||
      document.querySelector("article") ||
      document.querySelector(".content") ||
      document.querySelector("#content");
    if (mainElement) {
      // Clone to avoid modifying actual DOM
      const mainClone = mainElement.cloneNode(true) as HTMLElement;

      // Remove scripts and large inline styles to reduce size
      mainClone.querySelectorAll("script").forEach((el) => el.remove());
      Array.from(mainClone.querySelectorAll("*")).forEach((el) => {
        if (
          (el as HTMLElement).style &&
          (el as HTMLElement).style.cssText.length > 100
        ) {
          (el as HTMLElement).style.cssText = "";
        }
      });

      // Get a sample of the HTML (up to ~10KB)
      htmlStructure.mainContentHtml = mainClone.outerHTML.substring(0, 10000);
    }

    // Identify significant elements (forms, cards, galleries, etc.)
    const significantSelectors = [
      "form",
      '.card, .cards, [class*="card-"], [class*="cards-"]',
      '.gallery, [class*="gallery-"], [class*="slider-"], .carousel',
      '.hero, .banner, .jumbotron, [class*="hero-"]',
      "table",
    ];

    significantSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        htmlStructure.significantElements.push({
          selector,
          count: elements.length,
          sample:
            elements.length > 0
              ? (elements[0] as HTMLElement).outerHTML.substring(0, 500)
              : "",
        });
      }
    });

    return htmlStructure;
  });
}

export async function scrapeWebsite(url: string): Promise<WebsiteContent> {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    );
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 20000,
    });

    await waitForDynamicContentToLoad(page);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const title = await page.title();
    const description = await page.evaluate(() => {
      const metaDescription = document.querySelector(
        'meta[name="description"]',
      );
      return metaDescription ? metaDescription.getAttribute("content") : "";
    });

    const html = await page.content();
    const detailedHtmlStructure = await extractDetailedHtmlStructure(page);

    const images = await page.evaluate(() => {
      const imgElements = Array.from(document.querySelectorAll("img"));
      const backgroundImages = Array.from(
        document.querySelectorAll("*"),
      ).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.backgroundImage && style.backgroundImage !== "none";
      });

      const regularImages = imgElements.map((img) => {
        const rect = img.getBoundingClientRect();
        const isVisible = rect.width > 1 && rect.height > 1;

        return {
          url: img.src,
          alt: img.alt || "",
          dimensions:
            img.width && img.height
              ? { width: img.width, height: img.height }
              : undefined,
          isVisible,
          type: "img",
        };
      });

      const extractedBackgroundImages = backgroundImages.map((el) => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 1 && rect.height > 1;

        const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
        const url = urlMatch ? urlMatch[1] : "";

        return {
          url,
          alt: el.getAttribute("aria-label") || "",
          dimensions: { width: rect.width, height: rect.height },
          isVisible,
          type: "background",
        };
      });

      return [...regularImages, ...extractedBackgroundImages].filter(
        (img) =>
          img.url &&
          !img.url.startsWith("data:") &&
          !img.url.includes("placeholder"),
      );
    });

    const videos = await page.evaluate(() => {
      const videoElements = Array.from(document.querySelectorAll("video"));
      const backgroundVideos = Array.from(
        document.querySelectorAll("*"),
      ).filter((el) => {
        const style = window.getComputedStyle(el);
        const hasVideo = style.backgroundImage?.includes("video") || false;
        return hasVideo;
      });

      const regularVideos = videoElements
        .map((video) => {
          const sources = Array.from(video.querySelectorAll("source"));
          const sourceUrl = sources.length > 0 ? sources[0].src : video.src;

          return {
            url: sourceUrl,
            type: "html5",
          };
        })
        .filter((v) => v.url);

      const extractedBackgroundVideos = backgroundVideos
        .map((el) => {
          const style = window.getComputedStyle(el);
          const videoMatch = style.backgroundImage.match(
            /url\(['"]?(.*?)['"]?\)/,
          );
          const url = videoMatch ? videoMatch[1] : "";

          return {
            url,
            type: "background-video",
          };
        })
        .filter((v) => v.url);

      const youtubeFrames = Array.from(document.querySelectorAll("iframe"))
        .filter(
          (iframe) =>
            iframe.src.includes("youtube.com") ||
            iframe.src.includes("youtu.be"),
        )
        .map((frame) => {
          let youtubeId = "";
          const src = frame.src;

          if (src.includes("youtube.com/embed/")) {
            youtubeId = src.split("youtube.com/embed/")[1].split("?")[0];
          } else if (src.includes("youtube.com/watch?v=")) {
            youtubeId = new URL(src).searchParams.get("v") || "";
          }

          return {
            url: youtubeId
              ? `https://www.youtube.com/watch?v=${youtubeId}`
              : frame.src,
            type: "youtube",
            provider: "youtube",
          };
        })
        .filter((v) => v.url);

      return [...regularVideos, ...extractedBackgroundVideos, ...youtubeFrames];
    });

    // Measure page height and determine if scaling is needed
    const measurements = await page.evaluate(() => {
      const pageHeight = document.documentElement.scrollHeight;
      const pageWidth = document.documentElement.scrollWidth;
      return { pageHeight, pageWidth };
    });

    // Anthropic limit is 8000px, use 7500px as a safe limit
    const maxHeight = 7500;
    let screenshot;

    if (measurements.pageHeight <= maxHeight) {
      // For reasonable height pages, capture full page
      screenshot = await page.screenshot({
        fullPage: true,
        encoding: "base64",
        type: "jpeg",
        quality: 80,
      });
    } else {
      // For very tall pages, scale down the page
      const scaleFactor = maxHeight / measurements.pageHeight;

      // First capture the full content with proper aspect ratio
      await page.setViewport({
        width: Math.min(measurements.pageWidth, 1280),
        height: Math.floor(maxHeight),
        deviceScaleFactor: scaleFactor,
      });

      screenshot = await page.screenshot({
        fullPage: true,
        encoding: "base64",
        type: "jpeg",
        quality: 75,
      });
    }

    const structure = await extractSiteStructure(page);
    const metaTags = await extractMetaTags(page);

    await browser.close();

    return {
      html,
      htmlStructure: detailedHtmlStructure,
      images,
      videos,
      title,
      description,
      url,
      structure,
      metaTags,
      screenshot,
    };
  } catch (error) {
    console.error("Error during website scraping:", error);
    return fetchWebsiteContent(url);
  }
}
