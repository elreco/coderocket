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
    formats: [
      "markdown",
      "html",
      "links",
      "screenshot",
      {
        type: "json",
        prompt: `Extract comprehensive design information from this webpage:

**Theme & Colors:**
- primaryColor: main brand color (hex)
- secondaryColor: secondary brand color (hex)
- accentColors: array of accent colors (hex)
- backgroundColor: page background color (hex)
- textColor: primary text color (hex)

**Typography:**
- headingFonts: array of font families used for headings
- bodyFonts: array of font families used for body text
- fontSize: typical body font size (e.g., "16px")

**Layout:**
- type: layout type (e.g., "grid", "flex", "masonry")
- hasHero: boolean - has hero/banner section
- hasNavbar: boolean - has navigation bar
- hasFooter: boolean - has footer
- hasSidebar: boolean - has sidebar
- maxWidth: content max-width if applicable (e.g., "1200px")

**Design Elements:**
- borderRadius: typical border radius (e.g., "8px", "rounded")
- shadows: uses box shadows (boolean)
- spacing: typical spacing pattern (e.g., "tight", "normal", "spacious")

**Components:**
- buttonStyle: button design (e.g., "rounded", "square", "pill")
- cardStyle: card/container style if present
- navigationStyle: navigation type (e.g., "horizontal", "sidebar", "hamburger")`,
      },
    ],
    onlyMainContent: false,
    actions: [
      { type: "wait", milliseconds: 2000 },
      { type: "scroll", direction: "down" },
      { type: "wait", milliseconds: 500 },
    ],
    waitFor: 3000,
    timeout: 60000,
  });

  if (!result) {
    throw new Error(`Firecrawl scraping failed for ${url}. No data returned.`);
  }

  console.log("Firecrawl result received:", {
    hasHtml: !!result.html,
    htmlLength: result.html?.length || 0,
    hasMarkdown: !!result.markdown,
    markdownLength: result.markdown?.length || 0,
    hasScreenshot: !!result.screenshot,
    screenshotType: typeof result.screenshot,
    hasLinks: !!result.links,
    linksCount: result.links?.length || 0,
    hasJson: !!result.json,
    metadataKeys: Object.keys(result.metadata || {}),
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
    extractedData: result.json || {},
  };
}
