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

    const images = await page.evaluate(() => {
      const imgElements = Array.from(document.querySelectorAll("img"));
      return imgElements
        .map((img) => {
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
          };
        })
        .filter(
          (img) =>
            img.url &&
            !img.url.startsWith("data:") &&
            !img.url.includes("placeholder"),
        );
    });

    const videos = await page.evaluate(() => {
      const videoElements = Array.from(document.querySelectorAll("video"));
      const videoData = videoElements
        .map((video) => {
          const sources = Array.from(video.querySelectorAll("source"));
          const sourceUrl = sources.length > 0 ? sources[0].src : video.src;

          return {
            url: sourceUrl,
            type: "html5",
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

      return [...videoData, ...youtubeFrames];
    });

    const screenshot = (await page.screenshot({
      fullPage: false,
      encoding: "base64",
      type: "jpeg",
      quality: 60,
    })) as string;

    const structure = await extractSiteStructure(page);
    const metaTags = await extractMetaTags(page);

    await browser.close();

    return {
      html,
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
