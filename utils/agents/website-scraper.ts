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
  }>;
  title: string;
  description: string | null;
  url: string;
  screenshot?: string; // Base64 encoded screenshot
  metaTags?: Record<string, string>;
  structure?: {
    menu?: Array<{ text: string; url: string }>;
    sections?: Array<{ title?: string; content?: string; type: string }>;
    layout?: {
      header?: boolean;
      footer?: boolean;
      sidebar?: boolean;
      mainContent?: string;
    };
    colors?: Array<string>;
    fonts?: Array<string>;
    buttons?: Array<{ text: string; style: string }>;
    domTreeDepth?: number;
  };
}

/**
 * Fallback method to fetch website content using native fetch API
 */
async function fetchWebsiteContent(url: string): Promise<WebsiteContent> {
  try {
    const response = await fetch(url);
    const html = await response.text();

    // Create a DOM from HTML content
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract title
    const title = document.querySelector("title")?.textContent || url;

    // Extract description
    const metaDescription = document.querySelector('meta[name="description"]');
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
 * Extracts site structure including menus, sections, colors and fonts
 */
async function extractSiteStructure(
  page: Page,
): Promise<WebsiteContent["structure"]> {
  return await page.evaluate(() => {
    const structure: {
      menu: Array<{ text: string; url: string }>;
      sections: Array<{ title?: string; content?: string; type: string }>;
      colors: string[];
      fonts: string[];
      buttons: Array<{ text: string; style: string }>;
      layout: {
        header: boolean;
        footer: boolean;
        sidebar: boolean;
        mainContent: string;
      };
      domTreeDepth?: number;
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
        mainContent: "",
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
      const section = {
        title:
          item.element.querySelector("h1, h2, h3")?.textContent?.trim() ||
          undefined,
        content:
          item.element.textContent?.trim().substring(0, 200) || undefined,
        type: item.type,
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

    // Try to determine the main content structure
    const mainElement = document.querySelector("main, [role='main']");
    if (mainElement) {
      // Count children to determine if it's a grid, flex, or standard layout
      const mainChildren = mainElement.children;
      const childrenCount = mainChildren.length;

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
      const mainStyle = window.getComputedStyle(mainElement);
      if (mainStyle.display === "flex" || mainStyle.display === "grid") {
        structure.layout.mainContent = mainStyle.display;
      } else if (!structure.layout.mainContent) {
        structure.layout.mainContent = "standard";
      }
    }

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

    // Extract fonts
    const fontSet = new Set<string>();
    allElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const fontFamily = style.fontFamily;
      if (fontFamily) {
        fontSet.add(fontFamily);
      }
    });

    structure.fonts = Array.from(fontSet).slice(0, 5);

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
          style: `bg:${style.backgroundColor}, color:${style.color}, radius:${style.borderRadius}`,
        };
      })
      .filter((btn) => btn.text);

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
    args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
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

    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Set timeout for navigation
    await page.setDefaultNavigationTimeout(30000);

    // Navigate to the URL
    await page.goto(url, { waitUntil: "networkidle2" });

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
      return Array.from(document.querySelectorAll("img"))
        .map((img) => {
          return {
            url: img.src,
            alt: img.alt || "",
            dimensions:
              img.width && img.height
                ? { width: img.width, height: img.height }
                : undefined,
          };
        })
        .filter(
          (img) =>
            img.url &&
            !img.url.startsWith("data:") &&
            !img.url.includes("placeholder"),
        );
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
    };
  } catch (error) {
    console.error("Error during Puppeteer website scraping:", error);

    // Try fallback method
    console.log("Attempting fallback fetch method...");
    return fetchWebsiteContent(url);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
