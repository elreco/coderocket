"use server";

import chromium from "@sparticuz/chromium";
import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer-core";
import TurndownService from "turndown";

interface WebsiteContent {
  html: string;
  markdown: string;
  title: string;
  description: string | null;
  url: string;
  screenshot: string;
  images: Array<{
    url: string;
    alt: string;
    isLogo: boolean;
  }>;
}

const isDev = process.env.NODE_ENV === "development";

async function getBrowser(): Promise<Browser> {
  const commonArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-web-security",
    "--disable-dev-shm-usage",
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
      ".cookie-accept",
      "#cookie-accept",
    ];

    for (const selector of cookieSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          break;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return;
  }
}

async function waitForLoadersToDisappear(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const checkLoaders = () => {
          const loaders = document.querySelectorAll(
            '[class*="loader"], [class*="loading"], [class*="spinner"]',
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
  } catch {
    return;
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
        title.includes("just a moment") ||
        title.includes("cloudflare")
      );
    });

    if (isCloudflareChallenge) {
      console.log("Cloudflare challenge detected, waiting...");

      await page
        .waitForFunction(
          () => {
            const bodyText = document.body.innerText.toLowerCase();
            return !bodyText.includes("checking your browser");
          },
          { timeout: 15000 },
        )
        .catch(() => {
          console.log("Cloudflare challenge timeout");
        });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function scrollAndWaitForImages(page: Page): Promise<void> {
  try {
    console.log("📜 Starting aggressive image loading...");

    await page.evaluate(async () => {
      const loadAllImages = () => {
        document.querySelectorAll("img[loading='lazy']").forEach((img) => {
          img.setAttribute("loading", "eager");
        });

        document.querySelectorAll("img[data-src]").forEach((img) => {
          const dataSrc = img.getAttribute("data-src");
          if (dataSrc && !img.getAttribute("src")) {
            img.setAttribute("src", dataSrc);
          }
        });

        document.querySelectorAll("img[data-srcset]").forEach((img) => {
          const dataSrcset = img.getAttribute("data-srcset");
          if (dataSrcset && !img.getAttribute("srcset")) {
            img.setAttribute("srcset", dataSrcset);
          }
        });
      };

      loadAllImages();

      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 400;
        const scrollDelay = 150;

        const timer = setInterval(() => {
          loadAllImages();

          const scrollHeight = document.documentElement.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight + window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, scrollDelay);

        setTimeout(() => {
          clearInterval(timer);
          resolve();
        }, 12000);
      });

      loadAllImages();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    console.log("🖼️  Waiting for all images to load...");

    const totalImages = await page.evaluate(() => document.images.length);
    console.log(`Found ${totalImages} images on page`);

    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) {
                resolve(true);
              } else {
                img.addEventListener("load", () => resolve(true));
                img.addEventListener("error", () => resolve(false));
                setTimeout(() => resolve(false), 5000);
              }
            }),
        ),
      );
    });

    const loadedImages = await page.evaluate(() => {
      return Array.from(document.images).filter((img) => img.complete).length;
    });

    console.log(`✅ ${loadedImages}/${totalImages} images loaded`);

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));
  } catch (error) {
    console.log("⚠️  Error during image loading:", error);
  }
}

function extractImages(
  html: string,
  baseUrl: string,
): Array<{ url: string; alt: string; isLogo: boolean }> {
  const $ = cheerio.load(html);
  const images: Array<{ url: string; alt: string; isLogo: boolean }> = [];
  const seenUrls = new Set<string>();

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

  const logoSelectors = [
    "img[class*='logo']",
    "img[id*='logo']",
    "img[alt*='logo' i]",
    ".logo img",
    "#logo img",
    "header img:first-of-type",
    "nav img:first-of-type",
  ];

  logoSelectors.forEach((selector) => {
    $(selector).each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.includes("data:image") && !seenUrls.has(src)) {
        seenUrls.add(src);
        images.push({
          url: makeAbsoluteUrl(src),
          alt: $(el).attr("alt") || "Logo",
          isLogo: true,
        });
      }
    });
  });

  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && !src.includes("data:image") && !seenUrls.has(src)) {
      seenUrls.add(src);
      images.push({
        url: makeAbsoluteUrl(src),
        alt: $(el).attr("alt") || "",
        isLogo: false,
      });
    }
  });

  return images.slice(0, 20);
}

function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe, svg").remove();

  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  turndownService.remove(["script", "style", "noscript", "iframe"]);

  const cleanedHtml = $("body").html() || html;

  let markdown = turndownService.turndown(cleanedHtml);

  markdown = markdown
    .split("\n")
    .filter((line: string) => line.trim().length > 0)
    .join("\n\n");

  markdown = markdown.replace(/\n{3,}/g, "\n\n");

  return markdown.substring(0, 50000);
}

export async function scrapeWebsiteSimple(
  url: string,
): Promise<WebsiteContent> {
  let browser: Browser | null = null;

  try {
    console.log(`Starting simple scraping for: ${url}`);

    browser = await getBrowser();
    const page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    try {
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
    } catch {
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
    await scrollAndWaitForImages(page);

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

    const markdown = htmlToMarkdown(html);

    const images = extractImages(html, url);

    console.log("Simple scraping successful:", {
      title,
      hasScreenshot: !!screenshot,
      markdownLength: markdown.length,
      imagesFound: images.length,
      logosFound: images.filter((img) => img.isLogo).length,
    });

    return {
      html,
      markdown,
      title,
      description,
      url,
      screenshot,
      images,
    };
  } catch (error) {
    console.error("Error in scrapeWebsiteSimple:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
