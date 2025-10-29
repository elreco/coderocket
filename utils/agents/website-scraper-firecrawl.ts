"use server";

import Firecrawl from "firecrawl";

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
    maxAge: 3600000,
    actions: [
      { type: "wait", milliseconds: 2000 },
      { type: "screenshot", fullPage: false },
    ],
    waitFor: 3000,
    timeout: 30000,
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
  });

  return {
    html: result.html || "",
    markdown: result.markdown || "",
    title: result.metadata?.title || url,
    description: result.metadata?.description || null,
    url,
    screenshot: result.screenshot || undefined,
    metaTags: result.metadata as Record<string, string>,
    links: result.links || [],
    extractedData: {},
  };
}
