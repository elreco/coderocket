"use server";

import Firecrawl from "firecrawl";

interface WebsiteContent {
  html: string;
  markdown?: string;
  title: string;
  description: string | null;
  url: string;
  screenshot?: string;
  images?: Array<{
    url: string;
    alt: string;
    isLogo: boolean;
  }>;
  metaTags?: Record<string, string>;
  links?: string[];
  extractedData?: {
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
      accentColors?: string[];
      backgroundColor?: string;
      textColor?: string;
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
    };
    components?: {
      buttonStyle?: string;
      cardStyle?: string;
      navigationStyle?: string;
    };
  };
}

export async function scrapeWebsiteWithFirecrawl(
  url: string,
): Promise<WebsiteContent> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error(
      "FIRECRAWL_API_KEY is not set in environment variables. Please add it to your .env.local file. Get your API key at https://www.firecrawl.dev/",
    );
  }

  const firecrawl = new Firecrawl({ apiKey });

  console.log(`Starting Firecrawl scraping for: ${url}`);

  const result = await firecrawl.scrape(url, {
    formats: ["markdown", "screenshot"],
    onlyMainContent: false,
    blockAds: true,
    removeTags: ["script", "style", "noscript"],
    maxAge: 3600000,
    actions: [
      { type: "wait", milliseconds: 2000 },
      {
        type: "click",
        selector:
          'button:has-text("Accept"), button:has-text("Accepter"), button[id*="accept"], button[class*="accept"], #cookie-accept, .cookie-accept',
      },
      { type: "wait", milliseconds: 500 },
      {
        type: "executeJavascript",
        script: `
          // Hide common cookie/consent popups
          const popupSelectors = [
            '[class*="cookie"]',
            '[id*="cookie"]',
            '[class*="consent"]',
            '[id*="consent"]',
            '[class*="gdpr"]',
            '[class*="popup"]',
            '[class*="modal"]',
            '[role="dialog"]',
            '[aria-modal="true"]',
            '.notification-bar',
            '.banner'
          ];

          popupSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
              const text = el.innerText?.toLowerCase() || '';
              if (text.includes('cookie') || text.includes('consent') || text.includes('privacy') || text.includes('gdpr')) {
                el.style.display = 'none';
                el.remove();
              }
            });
          });

          // Remove fixed overlays
          document.querySelectorAll('body > div').forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' && parseInt(style.zIndex) > 1000) {
              el.style.display = 'none';
            }
          });

          // Remove body overflow hidden (often set by modals)
          document.body.style.overflow = 'auto';
        `,
      },
      { type: "wait", milliseconds: 1000 },
      { type: "scroll", direction: "down" },
      { type: "wait", milliseconds: 1000 },
      { type: "screenshot", fullPage: true },
    ],
    waitFor: 3000,
    timeout: 60000,
  });

  if (!result) {
    throw new Error(`Firecrawl scraping failed for ${url}. No data returned.`);
  }

  console.log("Firecrawl results received:", {
    hasHtml: !!result.html,
    htmlLength: result.html?.length || 0,
    hasMarkdown: !!result.markdown,
    markdownLength: result.markdown?.length || 0,
    hasScreenshot: !!result.screenshot,
    screenshotType: typeof result.screenshot,
    screenshotPreview: result.screenshot?.substring(0, 100),
  });

  let processedScreenshot: string | undefined = undefined;

  if (result.screenshot) {
    if (result.screenshot.startsWith("http")) {
      console.log(
        "Firecrawl screenshot is a URL, fetching and converting to base64...",
      );
      try {
        const response = await fetch(result.screenshot);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        processedScreenshot = buffer.toString("base64");
        console.log(
          "Screenshot converted to base64, size:",
          processedScreenshot.length,
        );
      } catch (error) {
        console.error(
          "Failed to fetch and convert screenshot from URL:",
          error,
        );
      }
    } else if (result.screenshot.startsWith("data:image")) {
      console.log(
        "Firecrawl screenshot has data URI prefix, extracting base64...",
      );
      const base64Match = result.screenshot.match(/base64,(.+)/);
      if (base64Match) {
        processedScreenshot = base64Match[1];
      }
    } else {
      processedScreenshot = result.screenshot;
    }
  }

  return {
    html: result.html || "",
    markdown: result.markdown || "",
    title: result.metadata?.title || url,
    description: result.metadata?.description || null,
    url,
    screenshot: processedScreenshot,
    images: [],
    metaTags: result.metadata as Record<string, string>,
    links: result.links || [],
    extractedData: {},
  };
}
