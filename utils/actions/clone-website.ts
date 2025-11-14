"use server";

import { scrapeWebsiteWithFirecrawl } from "@/utils/agents/website-scraper-firecrawl";
import { scrapeWebsiteSimple } from "@/utils/agents/website-scraper-simple";

export async function cloneWebsite(url: string) {
  try {
    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`🚀 Starting website clone: ${url}`);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Clone timeout after 75 seconds")),
        75000,
      );
    });

    let websiteData;
    let usedMethod = "simple";

    console.log("✨ Trying simple scraper first (FREE)...");
    try {
      const scraping = scrapeWebsiteSimple(url);
      websiteData = await Promise.race([scraping, timeout]);
      console.log("✅ Simple scraping successful:", {
        title: websiteData.title,
        hasMarkdown: !!websiteData.markdown,
        hasScreenshot: !!websiteData.screenshot,
        imagesFound: websiteData.images?.length || 0,
      });
    } catch (simpleError) {
      console.warn(
        "❌ Simple scraper failed, trying Firecrawl fallback:",
        simpleError,
      );

      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

      if (firecrawlApiKey) {
        usedMethod = "firecrawl-fallback";

        const scraping = scrapeWebsiteWithFirecrawl(url);
        websiteData = await Promise.race([scraping, timeout]);
        console.log("✅ Firecrawl fallback successful:", {
          title: websiteData.title,
          hasMarkdown: !!websiteData.markdown,
          hasScreenshot: !!websiteData.screenshot,
        });
      } else {
        const errorMessage =
          simpleError instanceof Error ? simpleError.message : "";
        throw new Error(
          "Simple scraper failed and Firecrawl API key is not configured. Error: " +
            errorMessage,
        );
      }
    }

    console.log(`✅ Website clone completed using: ${usedMethod}`);

    return {
      success: true,
      data: websiteData,
      method: usedMethod,
    };
  } catch (error) {
    console.error("❌ Error in cloneWebsite:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
