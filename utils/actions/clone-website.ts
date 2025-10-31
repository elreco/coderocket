"use server";

import { scrapeWebsiteAdvanced } from "@/utils/agents/website-scraper-advanced";
import { scrapeWebsiteWithFirecrawl } from "@/utils/agents/website-scraper-firecrawl";

async function checkCloudflare(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const headers = response.headers;
    const cfRay = headers.get("cf-ray");
    const server = headers.get("server");
    const cfCacheStatus = headers.get("cf-cache-status");

    return !!(
      cfRay ||
      server?.toLowerCase().includes("cloudflare") ||
      cfCacheStatus
    );
  } catch {
    return false;
  }
}

export async function cloneWebsite(url: string) {
  try {
    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`Starting website clone: ${url}`);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Clone timeout after 75 seconds")),
        75000,
      );
    });

    let websiteData;
    let usedMethod = "advanced";

    const hasCloudflare = await checkCloudflare(url);

    if (hasCloudflare) {
      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

      if (firecrawlApiKey) {
        console.log(
          "⚡ Cloudflare detected! Using Firecrawl directly (faster & more reliable)",
        );
        usedMethod = "firecrawl-cloudflare";

        const scraping = scrapeWebsiteWithFirecrawl(url);
        websiteData = await Promise.race([scraping, timeout]);
        console.log("✅ Firecrawl scraping successful:", {
          title: websiteData.title,
          hasMarkdown: !!websiteData.markdown,
          hasScreenshot: !!websiteData.screenshot,
        });
      } else {
        console.log(
          "⚠️ Cloudflare detected but no Firecrawl API key. Trying Puppeteer anyway...",
        );
        const scraping = scrapeWebsiteAdvanced(url);
        websiteData = await Promise.race([scraping, timeout]);
        console.log("✅ Advanced scraping successful despite Cloudflare:", {
          title: websiteData.title,
          hasMarkdown: !!websiteData.markdown,
          hasScreenshot: !!websiteData.screenshot,
        });
      }
    } else {
      console.log("✨ No Cloudflare detected, using advanced scraper (FREE)");
      try {
        const scraping = scrapeWebsiteAdvanced(url);
        websiteData = await Promise.race([scraping, timeout]);
        console.log("✅ Advanced scraping successful:", {
          title: websiteData.title,
          hasMarkdown: !!websiteData.markdown,
          hasScreenshot: !!websiteData.screenshot,
          hasExtractedData: !!websiteData.extractedData,
        });
      } catch (advancedError) {
        console.warn(
          "❌ Advanced scraper failed, falling back to Firecrawl:",
          advancedError,
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
            advancedError instanceof Error ? advancedError.message : "";
          throw new Error(
            "Advanced scraper failed and Firecrawl API key is not configured. Error: " +
              errorMessage,
          );
        }
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
