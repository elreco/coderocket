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
  images: Array<{
    url: string;
    alt: string;
    isHero?: boolean;
    isVisible?: boolean;
    type?: string;
    role?: string;
    className?: string;
  }>;
  videos?: Array<{
    url: string;
    type: string;
    provider?: string;
  }>;
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
      responsive?: boolean;
    };
    buttons?: Array<{
      text: string;
      type?: string;
    }>;
    colors?: string[];
    fonts?: string[];
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

  const result = await firecrawl.scrape(url, {
    formats: ["html", "markdown", "screenshot"],
    onlyMainContent: false,
    includeTags: [
      "img",
      "video",
      "style",
      "link",
      "script",
      "meta",
      "header",
      "nav",
      "main",
      "section",
      "footer",
      "aside",
      "article",
    ],
    waitFor: 3000,
    timeout: 60000,
  });

  if (!result) {
    throw new Error(`Firecrawl scraping failed for ${url}. No data returned.`);
  }

  console.log("Firecrawl result:", {
    hasHtml: !!result.html,
    hasMarkdown: !!result.markdown,
    hasScreenshot: !!result.screenshot,
    screenshotType: typeof result.screenshot,
    screenshotPreview: result.screenshot
      ? `${result.screenshot.substring(0, 50)}...`
      : null,
    metadataKeys: Object.keys(result.metadata || {}),
  });

  const html = result.html || "";
  const markdown = result.markdown || "";
  const metadata = result.metadata || {};
  const screenshot = result.screenshot || undefined;

  return {
    html,
    markdown,
    title: metadata.title || url,
    description: metadata.description || null,
    url,
    screenshot,
    metaTags: metadata as Record<string, string>,
    images: [],
    videos: [],
    structure: undefined,
  };
}
