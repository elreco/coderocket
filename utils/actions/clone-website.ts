"use server";

import { scrapeWebsiteWithFirecrawl } from "@/utils/agents/website-scraper-firecrawl";

export async function cloneWebsite(url: string) {
  try {
    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`Starting website clone with Firecrawl: ${url}`);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Clone timeout after 90 seconds")),
        90000,
      );
    });

    const scraping = scrapeWebsiteWithFirecrawl(url);
    const websiteData = await Promise.race([scraping, timeout]);

    console.log("Firecrawl scraping successful:", {
      title: websiteData.title,
      hasMarkdown: !!websiteData.markdown,
      hasScreenshot: !!websiteData.screenshot,
      hasExtractedData: !!websiteData.extractedData,
    });

    return {
      success: true,
      data: websiteData,
    };
  } catch (error) {
    console.error("Error in cloneWebsite:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
