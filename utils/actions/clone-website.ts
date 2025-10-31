"use server";

import { scrapeWebsiteAdvanced } from "@/utils/agents/website-scraper-advanced";
import { scrapeWebsiteWithFirecrawl } from "@/utils/agents/website-scraper-firecrawl";

export async function cloneWebsite(url: string) {
  try {
    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`Starting website clone with advanced scraper: ${url}`);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Clone timeout after 75 seconds")),
        75000,
      );
    });

    let websiteData;
    let usedMethod = "advanced";

    try {
      const scraping = scrapeWebsiteAdvanced(url);
      websiteData = await Promise.race([scraping, timeout]);
      console.log("Advanced scraping successful:", {
        title: websiteData.title,
        hasMarkdown: !!websiteData.markdown,
        hasScreenshot: !!websiteData.screenshot,
        hasExtractedData: !!websiteData.extractedData,
      });
    } catch (advancedError) {
      console.warn(
        "Advanced scraper failed, falling back to Firecrawl:",
        advancedError,
      );

      const errorMessage =
        advancedError instanceof Error ? advancedError.message : "";
      const isCloudflareBlock =
        errorMessage.includes("403") ||
        errorMessage.includes("Cloudflare") ||
        errorMessage.includes("bot");

      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

      if (isCloudflareBlock && firecrawlApiKey) {
        console.log(
          "Cloudflare or bot protection detected, using Firecrawl fallback",
        );
        usedMethod = "firecrawl-cloudflare";

        const scraping = scrapeWebsiteWithFirecrawl(url);
        websiteData = await Promise.race([scraping, timeout]);
        console.log("Firecrawl fallback successful:", {
          title: websiteData.title,
          hasMarkdown: !!websiteData.markdown,
          hasScreenshot: !!websiteData.screenshot,
        });
      } else if (firecrawlApiKey) {
        usedMethod = "firecrawl";

        const scraping = scrapeWebsiteWithFirecrawl(url);
        websiteData = await Promise.race([scraping, timeout]);
        console.log("Firecrawl fallback successful:", {
          title: websiteData.title,
          hasMarkdown: !!websiteData.markdown,
          hasScreenshot: !!websiteData.screenshot,
        });
      } else {
        throw new Error(
          "Advanced scraper failed and Firecrawl API key is not configured. Error: " +
            errorMessage,
        );
      }
    }

    console.log(`Website clone completed using: ${usedMethod}`);

    return {
      success: true,
      data: websiteData,
      method: usedMethod,
    };
  } catch (error) {
    console.error("Error in cloneWebsite:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
