"use server";

import chromium from "@sparticuz/chromium";
import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer-core";

interface WebsiteContent {
  html: string;
  markdown?: string;
  title: string;
  description: string | null;
  url: string;
  screenshot?: string;
  metaTags?: Record<string, string>;
  links?: string[];
  extractedData?: {
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
      accentColors?: string[];
      backgroundColor?: string;
      textColor?: string;
      allColors?: string[];
      computedStyles?: ComputedStyles;
    };
    typography?: {
      headingFonts?: string[];
      bodyFonts?: string[];
      fontSize?: string;
    };
    layout?: {
      type?: string;
      hasHero?: boolean;
      hasNavbar?: boolean;
      hasFooter?: boolean;
      hasSidebar?: boolean;
      maxWidth?: string;
    };
    designElements?: {
      borderRadius?: string;
      shadows?: boolean;
      spacing?: string;
      css?: string;
    };
    components?: {
      buttonStyle?: string;
      cardStyle?: string;
      navigationStyle?: string;
      detected?: Record<string, unknown>;
      media?: {
        logos: MediaAsset[];
        images: MediaAsset[];
        videos: MediaAsset[];
      };
    };
  };
}

const isDev = process.env.NODE_ENV === "development";

async function getBrowser(): Promise<Browser> {
  const commonArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-web-security",
    "--disable-features=VizDisplayCompositor",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--no-first-run",
    "--no-zygote",
    "--disable-gpu",
  ];

  if (isDev) {
    try {
      const puppeteerExtra = await import("puppeteer-extra");
      const StealthPlugin = await import("puppeteer-extra-plugin-stealth");
      const puppeteerModule = await import("puppeteer");

      puppeteerExtra.default.use(StealthPlugin.default());

      return (await puppeteerExtra.default.launch({
        executablePath: puppeteerModule.default.executablePath(),
        headless: true,
        args: commonArgs,
      })) as unknown as Browser;
    } catch {
      console.log("Stealth plugin not available, using standard puppeteer");
      const puppeteerModule = await import("puppeteer");
      return await puppeteerModule.default.launch({
        headless: true,
        args: commonArgs,
      });
    }
  } else {
    return await puppeteer.launch({
      args: [...chromium.args, ...commonArgs],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
}

interface ExtractedColors {
  primaryColor?: string;
  secondaryColor?: string;
  accentColors: string[];
  backgroundColor?: string;
  textColor?: string;
  allColors: string[];
}

function extractColors(html: string): ExtractedColors {
  const $ = cheerio.load(html);
  const colors = new Set<string>();
  const colorCounts = new Map<string, number>();

  $("*").each((_, element) => {
    const style = $(element).attr("style");
    if (style) {
      const colorMatch = style.match(
        /(?:color|background-color|background|border-color):\s*([^;]+)/gi,
      );
      if (colorMatch) {
        colorMatch.forEach((match) => {
          const color = match.split(":")[1]?.trim();
          if (color && !color.includes("transparent") && color !== "inherit") {
            colors.add(color);
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
          }
        });
      }
    }

    ["class", "className"].forEach((attr) => {
      const classes = $(element).attr(attr);
      if (classes) {
        const bgMatch = classes.match(/bg-[\w-]+/g);
        const textMatch = classes.match(/text-[\w-]+/g);
        bgMatch?.forEach((c) => {
          colors.add(c);
          colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
        });
        textMatch?.forEach((c) => {
          colors.add(c);
          colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
        });
      }
    });
  });

  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  return {
    backgroundColor: sortedColors[0],
    primaryColor: sortedColors[1],
    secondaryColor: sortedColors[2],
    textColor: sortedColors[3],
    accentColors: sortedColors.slice(4, 8),
    allColors: sortedColors.slice(0, 20),
  };
}

function extractFonts(html: string): {
  headingFonts: string[];
  bodyFonts: string[];
} {
  const $ = cheerio.load(html);
  const fonts = new Set<string>();

  $("link[href*='fonts.googleapis.com']").each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      const fontMatch = href.match(/family=([^&:]+)/);
      if (fontMatch) {
        fonts.add(fontMatch[1].replace(/\+/g, " "));
      }
    }
  });

  $("*").each((_, element) => {
    const style = $(element).attr("style");
    if (style) {
      const fontMatch = style.match(/font-family:\s*([^;]+)/i);
      if (fontMatch) {
        const fontFamily = fontMatch[1]
          .split(",")[0]
          ?.replace(/['"]/g, "")
          .trim();
        if (fontFamily) {
          fonts.add(fontFamily);
        }
      }
    }
  });

  const fontArray = Array.from(fonts);
  return {
    headingFonts: fontArray.slice(0, 2),
    bodyFonts: fontArray.slice(0, 3),
  };
}

function analyzeLayout(html: string): {
  type: string;
  hasHero: boolean;
  hasNavbar: boolean;
  hasFooter: boolean;
  hasSidebar: boolean;
  maxWidth?: string;
} {
  const $ = cheerio.load(html);

  const hasHero =
    $("header, .hero, [class*='hero'], section:first-of-type").length > 0;
  const hasNavbar =
    $(
      "nav, .navbar, .navigation, [class*='nav'], [role='navigation'], header nav",
    ).length > 0;
  const hasFooter = $("footer, .footer, [class*='footer']").length > 0;
  const hasSidebar =
    $(".sidebar, [class*='sidebar'], aside, [role='complementary']").length > 0;

  let layoutType = "standard";
  if (hasSidebar) layoutType = "sidebar";
  if ($(".container-fluid, [class*='full-width']").length > 0)
    layoutType = "full-width";

  return {
    type: layoutType,
    hasHero,
    hasNavbar,
    hasFooter,
    hasSidebar,
    maxWidth: "1280px",
  };
}

interface MediaAsset {
  type: "image" | "video" | "logo";
  src: string;
  alt?: string;
  width?: string;
  height?: string;
  format?: string;
  isLogo?: boolean;
  videoType?: "youtube" | "vimeo" | "native" | "other";
  thumbnail?: string;
}

function analyzeComponents(
  html: string,
  baseUrl: string,
): {
  buttons: { count: number; styles: string[] };
  cards: { count: number; styles: string[] };
  forms: { count: number; types: string[] };
  images: { count: number; sources: string[] };
  media: {
    logos: MediaAsset[];
    images: MediaAsset[];
    videos: MediaAsset[];
  };
} {
  const $ = cheerio.load(html);

  const buttons = new Set<string>();
  $("button, [role='button'], a.btn, a.button, input[type='submit']").each(
    (_, el) => {
      const classes = $(el).attr("class") || "";
      buttons.add(classes);
    },
  );

  const cards = new Set<string>();
  $(".card, [class*='card'], article, .item, [class*='item']").each((_, el) => {
    const classes = $(el).attr("class") || "";
    if (classes) cards.add(classes);
  });

  const formTypes = new Set<string>();
  $("form, [role='form']").each((_, el) => {
    const inputs = $(el).find("input, select, textarea");
    inputs.each((_, input) => {
      const type = $(input).attr("type") || $(input).prop("tagName");
      if (type) formTypes.add(type.toLowerCase());
    });
  });

  const makeAbsoluteUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) {
      try {
        const base = new URL(baseUrl);
        return `${base.protocol}//${base.host}${url}`;
      } catch {
        return url;
      }
    }
    return url;
  };

  const logos: MediaAsset[] = [];
  const images: MediaAsset[] = [];
  const videos: MediaAsset[] = [];

  const logoSelectors = [
    "img[class*='logo']",
    "img[id*='logo']",
    "img[alt*='logo' i]",
    "img[alt*='brand' i]",
    ".logo img",
    "#logo img",
    "header img:first-of-type",
    "nav img:first-of-type",
    "[class*='brand'] img",
    "[class*='header'] img:first-of-type",
  ];

  const detectedLogos = new Set<string>();
  logoSelectors.forEach((selector) => {
    $(selector).each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.includes("data:image") && !detectedLogos.has(src)) {
        detectedLogos.add(src);
        logos.push({
          type: "logo",
          src: makeAbsoluteUrl(src),
          alt: $(el).attr("alt") || "Logo",
          width: $(el).attr("width"),
          height: $(el).attr("height"),
          isLogo: true,
        });
      }
    });
  });

  const allImageSources = new Set<string>();
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (
      src &&
      !src.includes("data:image") &&
      !detectedLogos.has(src) &&
      !allImageSources.has(src)
    ) {
      allImageSources.add(src);
      const absoluteSrc = makeAbsoluteUrl(src);
      images.push({
        type: "image",
        src: absoluteSrc,
        alt: $(el).attr("alt") || "",
        width: $(el).attr("width"),
        height: $(el).attr("height"),
        format: absoluteSrc.split(".").pop()?.split("?")[0],
      });
    }
  });

  $("video source, video").each((_, el) => {
    const src = $(el).attr("src");
    if (src) {
      videos.push({
        type: "video",
        src: makeAbsoluteUrl(src),
        videoType: "native",
        format: src.split(".").pop()?.split("?")[0],
      });
    }
  });

  $("iframe").each((_, el) => {
    const src = $(el).attr("src");
    if (src) {
      let videoType: "youtube" | "vimeo" | "other" = "other";
      if (src.includes("youtube.com") || src.includes("youtu.be")) {
        videoType = "youtube";
        const videoId = src.match(
          /(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/,
        )?.[1];
        videos.push({
          type: "video",
          src: src,
          videoType,
          thumbnail: videoId
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : undefined,
        });
      } else if (src.includes("vimeo.com")) {
        videoType = "vimeo";
        videos.push({
          type: "video",
          src: src,
          videoType,
        });
      } else if (
        src.includes("video") ||
        src.includes("embed") ||
        src.includes("player")
      ) {
        videos.push({
          type: "video",
          src: src,
          videoType: "other",
        });
      }
    }
  });

  return {
    buttons: {
      count: $("button, [role='button'], a.btn, a.button").length,
      styles: Array.from(buttons).slice(0, 5),
    },
    cards: {
      count: $(".card, [class*='card'], article").length,
      styles: Array.from(cards).slice(0, 5),
    },
    forms: {
      count: $("form, [role='form']").length,
      types: Array.from(formTypes),
    },
    images: {
      count: images.length,
      sources: images.slice(0, 20).map((img) => img.src),
    },
    media: {
      logos: logos.slice(0, 5),
      images: images.slice(0, 30),
      videos: videos.slice(0, 10),
    },
  };
}

function createStructuredDescription(
  html: string,
  title: string,
  colors: ExtractedColors,
  fonts: { headingFonts: string[]; bodyFonts: string[] },
  layout: {
    type: string;
    hasHero: boolean;
    hasNavbar: boolean;
    hasFooter: boolean;
    hasSidebar: boolean;
    maxWidth?: string;
  },
  components: {
    buttons: { count: number; styles: string[] };
    cards: { count: number; styles: string[] };
    forms: { count: number; types: string[] };
    images: { count: number; sources: string[] };
    media: {
      logos: MediaAsset[];
      images: MediaAsset[];
      videos: MediaAsset[];
    };
  },
): string {
  const $ = cheerio.load(html);

  let description = `# Website Analysis: ${title}\n\n`;

  description += `## Visual Design\n`;
  description += `- Primary color: ${colors.primaryColor || "not detected"}\n`;
  description += `- Background: ${colors.backgroundColor || "not detected"}\n`;
  description += `- Text color: ${colors.textColor || "not detected"}\n`;
  description += `- Accent colors: ${colors.accentColors.join(", ") || "none"}\n`;
  description += `- All detected colors: ${colors.allColors.slice(0, 10).join(", ")}\n\n`;

  description += `## Typography\n`;
  description += `- Heading fonts: ${fonts.headingFonts.join(", ") || "system default"}\n`;
  description += `- Body fonts: ${fonts.bodyFonts.join(", ") || "system default"}\n\n`;

  description += `## Layout Structure\n`;
  description += `- Type: ${layout.type}\n`;
  description += `- Has Hero: ${layout.hasHero ? "Yes" : "No"}\n`;
  description += `- Has Navigation: ${layout.hasNavbar ? "Yes" : "No"}\n`;
  description += `- Has Footer: ${layout.hasFooter ? "Yes" : "No"}\n`;
  description += `- Has Sidebar: ${layout.hasSidebar ? "Yes" : "No"}\n\n`;

  description += `## Components\n`;
  description += `- Buttons: ${components.buttons.count}\n`;
  description += `- Cards: ${components.cards.count}\n`;
  description += `- Forms: ${components.forms.count}\n`;
  description += `- Images: ${components.images.count}\n\n`;

  if (components.media.logos.length > 0) {
    description += `## Logos\n`;
    components.media.logos.forEach((logo) => {
      description += `- ${logo.src} (${logo.alt || "Logo"})\n`;
    });
    description += `\n`;
  }

  if (components.media.videos.length > 0) {
    description += `## Videos\n`;
    components.media.videos.forEach((video) => {
      description += `- [${video.videoType?.toUpperCase() || "VIDEO"}] ${video.src}\n`;
      if (video.thumbnail) {
        description += `  Thumbnail: ${video.thumbnail}\n`;
      }
    });
    description += `\n`;
  }

  description += `## Content Sections\n`;
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) description += `### ${text}\n`;
  });
  description += `\n`;

  $("h2").each((i, el) => {
    if (i < 10) {
      const text = $(el).text().trim();
      if (text) description += `- ${text}\n`;
    }
  });
  description += `\n`;

  description += `## Key Content\n`;
  $("p")
    .slice(0, 15)
    .each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && text.length < 200) {
        description += `${text}\n\n`;
      }
    });

  if (components.media.images.length > 0) {
    description += `## Images\n`;
    components.media.images.slice(0, 15).forEach((img) => {
      description += `- ${img.src}`;
      if (img.alt) description += ` (${img.alt})`;
      if (img.width || img.height)
        description += ` [${img.width || "auto"}x${img.height || "auto"}]`;
      description += `\n`;
    });
    description += `\n`;
  }

  return description;
}

interface ComputedStyles {
  body: {
    backgroundColor?: string;
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
  };
  buttons: Array<{
    backgroundColor?: string;
    color?: string;
    borderRadius?: string;
    padding?: string;
    fontSize?: string;
    fontWeight?: string;
  }>;
  headings: Array<{
    tag?: string;
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    lineHeight?: string;
  }>;
  links: Array<{
    color?: string;
    textDecoration?: string;
  }>;
}

async function handleCookiePopups(page: Page): Promise<void> {
  try {
    const cookieSelectors = [
      'button[id*="accept"]',
      'button[class*="accept"]',
      'button[id*="cookie"]',
      'button[class*="cookie"]',
      'button:has-text("Accept")',
      'button:has-text("Accepter")',
      'button:has-text("Accept all")',
      'button:has-text("Tout accepter")',
      '[id*="cookieAccept"]',
      '[class*="cookieAccept"]',
      ".cookie-accept",
      "#cookie-accept",
      'button[aria-label*="accept"]',
      'button[aria-label*="cookie"]',
    ];

    for (const selector of cookieSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          console.log(`Closed cookie popup with selector: ${selector}`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          break;
        }
      } catch {
        continue;
      }
    }
  } catch {
    console.log("No cookie popup found or failed to close");
  }
}

async function waitForLoadersToDisappear(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const checkLoaders = () => {
          const loaders = document.querySelectorAll(
            '[class*="loader"], [class*="loading"], [class*="spinner"], [id*="loader"], [id*="loading"]',
          );

          const visibleLoaders = Array.from(loaders).filter((el) => {
            const style = window.getComputedStyle(el as Element);
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.opacity !== "0"
            );
          });

          if (visibleLoaders.length === 0) {
            resolve(true);
          } else {
            setTimeout(checkLoaders, 500);
          }
        };

        checkLoaders();
        setTimeout(() => resolve(true), 5000);
      });
    });
    console.log("Loaders disappeared or timed out");
  } catch {
    console.log("Error waiting for loaders");
  }
}

async function waitForCloudflareChallenge(page: Page): Promise<boolean> {
  try {
    const isCloudflareChallenge = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      const title = document.title.toLowerCase();

      return (
        bodyText.includes("checking your browser") ||
        bodyText.includes("cloudflare") ||
        bodyText.includes("just a moment") ||
        bodyText.includes("ddos protection") ||
        title.includes("just a moment") ||
        title.includes("cloudflare") ||
        document.querySelector("#challenge-running") !== null ||
        document.querySelector(".cf-browser-verification") !== null
      );
    });

    if (isCloudflareChallenge) {
      console.log("Cloudflare challenge detected, waiting for resolution...");

      await page
        .waitForFunction(
          () => {
            const bodyText = document.body.innerText.toLowerCase();
            const title = document.title.toLowerCase();

            return !(
              bodyText.includes("checking your browser") ||
              bodyText.includes("just a moment") ||
              title.includes("just a moment") ||
              document.querySelector("#challenge-running") !== null
            );
          },
          { timeout: 15000 },
        )
        .catch(() => {
          console.log("Cloudflare challenge timeout");
        });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log("Cloudflare challenge resolved or timed out");
      return true;
    }

    return false;
  } catch {
    console.log("Error checking for Cloudflare challenge");
    return false;
  }
}

export async function scrapeWebsiteAdvanced(
  url: string,
): Promise<WebsiteContent> {
  let browser: Browser | null = null;

  try {
    console.log(`Starting advanced scraping for: ${url}`);

    browser = await getBrowser();
    const page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false,
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "max-age=0",
      "sec-ch-ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });

      (window.navigator as unknown as { chrome: unknown }).chrome = {
        runtime: {},
      };

      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en", "fr"],
      });

      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (
        parameters: PermissionDescriptor,
      ) =>
        parameters.name === "notifications"
          ? Promise.resolve({
              state: Notification.permission,
            } as PermissionStatus)
          : originalQuery(parameters);
    });

    try {
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
    } catch {
      console.log("First attempt failed, trying with domcontentloaded");
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const hadCloudflare = await waitForCloudflareChallenge(page);

    if (hadCloudflare) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    await handleCookiePopups(page);

    await waitForLoadersToDisappear(page);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const screenshotBuffer = (await page.screenshot({
      fullPage: true,
      encoding: "binary",
    })) as Buffer;
    const screenshot = screenshotBuffer.toString("base64");

    const html = await page.content();

    const title = await page.title();
    const description = await page
      .$eval('meta[name="description"]', (el) => el.getAttribute("content"))
      .catch(() => null);

    const metaTags: Record<string, string> = await page.evaluate(() => {
      const tags: Record<string, string> = {};
      document.querySelectorAll("meta").forEach((meta) => {
        const name = meta.getAttribute("name") || meta.getAttribute("property");
        const content = meta.getAttribute("content");
        if (name && content) {
          tags[name] = content;
        }
      });
      return tags;
    });

    const links: string[] = await page.$$eval("a[href]", (anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).href),
    );

    const computedStyles: ComputedStyles = await page.evaluate(() => {
      const styles = {
        body: {},
        buttons: [] as Array<Record<string, string>>,
        headings: [] as Array<Record<string, string>>,
        links: [] as Array<Record<string, string>>,
      };

      const body = document.body;
      if (body) {
        const bodyStyles = window.getComputedStyle(body);
        styles.body = {
          backgroundColor: bodyStyles.backgroundColor,
          color: bodyStyles.color,
          fontFamily: bodyStyles.fontFamily,
          fontSize: bodyStyles.fontSize,
          lineHeight: bodyStyles.lineHeight,
        };
      }

      const buttons = document.querySelectorAll("button, [role='button']");
      buttons.forEach((btn, i) => {
        if (i < 3) {
          const btnStyles = window.getComputedStyle(btn as Element);
          styles.buttons.push({
            backgroundColor: btnStyles.backgroundColor,
            color: btnStyles.color,
            borderRadius: btnStyles.borderRadius,
            padding: btnStyles.padding,
            fontSize: btnStyles.fontSize,
            fontWeight: btnStyles.fontWeight,
          });
        }
      });

      const headings = document.querySelectorAll("h1, h2, h3");
      headings.forEach((h, i) => {
        if (i < 3) {
          const hStyles = window.getComputedStyle(h as Element);
          styles.headings.push({
            tag: h.tagName.toLowerCase(),
            color: hStyles.color,
            fontFamily: hStyles.fontFamily,
            fontSize: hStyles.fontSize,
            fontWeight: hStyles.fontWeight,
            lineHeight: hStyles.lineHeight,
          });
        }
      });

      const linksElements = document.querySelectorAll("a");
      linksElements.forEach((link, i) => {
        if (i < 3) {
          const linkStyles = window.getComputedStyle(link as Element);
          styles.links.push({
            color: linkStyles.color,
            textDecoration: linkStyles.textDecoration,
          });
        }
      });

      return styles;
    });

    const allCSS = await page.evaluate(() => {
      const cssTexts: string[] = [];
      const styleSheets = Array.from(document.styleSheets);

      styleSheets.forEach((sheet) => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          const cssText = rules
            .map((rule) => rule.cssText)
            .join("\n")
            .substring(0, 50000);
          if (cssText) cssTexts.push(cssText);
        } catch {
          return;
        }
      });

      return cssTexts.join("\n\n");
    });

    const colors = extractColors(html);
    const fonts = extractFonts(html);
    const layout = analyzeLayout(html);
    const components = analyzeComponents(html, url);

    const structuredDescription = createStructuredDescription(
      html,
      title,
      colors,
      fonts,
      layout,
      components,
    );

    const markdown = structuredDescription;

    console.log("Advanced scraping successful:", {
      hasHtml: !!html,
      htmlLength: html.length,
      hasScreenshot: !!screenshot,
      hasMarkdown: !!markdown,
      colorsExtracted: colors.allColors.length,
      fontsExtracted: fonts.headingFonts.length + fonts.bodyFonts.length,
      componentsFound:
        components.buttons.count +
        components.cards.count +
        components.forms.count,
      logosFound: components.media.logos.length,
      imagesFound: components.media.images.length,
      videosFound: components.media.videos.length,
      cssExtracted: allCSS.length,
      computedStylesExtracted: !!computedStyles,
    });

    return {
      html,
      markdown,
      title,
      description,
      url,
      screenshot,
      metaTags,
      links: links.slice(0, 50),
      extractedData: {
        theme: {
          ...colors,
          computedStyles,
        },
        typography: {
          ...fonts,
          fontSize: computedStyles.body.fontSize || "16px",
        },
        layout,
        designElements: {
          borderRadius: computedStyles.buttons[0]?.borderRadius || "0.5rem",
          shadows: true,
          spacing: "1rem",
          css: allCSS.substring(0, 10000),
        },
        components: {
          buttonStyle: computedStyles.buttons[0]?.borderRadius || "rounded",
          cardStyle: "elevated",
          navigationStyle: "horizontal",
          detected: components,
          media: components.media,
        },
      },
    };
  } catch (error) {
    console.error("Error in scrapeWebsiteAdvanced:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
