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
    let shouldTryFirecrawl = false;

    try {
      const scraping = scrapeWebsiteSimple(url);
      websiteData = await Promise.race([scraping, timeout]);

      const contentToCheck = (
        websiteData.markdown ||
        websiteData.html ||
        ""
      ).toLowerCase();
      const titleToCheck = (websiteData.title || "").toLowerCase();

      const botProtectionIndicators = [
        "failed to verify your browser",
        "cloudflare",
        "just a moment",
        "checking your browser",
        "enable javascript and cookies",
        "please verify you are a human",
        "ray id",
        "security check",
        "access denied",
        "vercel",
        "bot protection",
        "challenge-platform",
      ];

      const hasProtection = botProtectionIndicators.some(
        (indicator) =>
          contentToCheck.includes(indicator) ||
          titleToCheck.includes(indicator),
      );

      if (hasProtection) {
        console.warn(
          "⚠️ Bot protection detected in simple scraper response, trying Firecrawl...",
        );
        shouldTryFirecrawl = true;
      } else {
        console.log("✅ Simple scraping successful:", {
          title: websiteData.title,
          hasMarkdown: !!websiteData.markdown,
          hasScreenshot: !!websiteData.screenshot,
          imagesFound: websiteData.images?.length || 0,
        });
      }
    } catch (simpleError) {
      console.warn(
        "❌ Simple scraper failed with error, trying Firecrawl fallback:",
        simpleError,
      );
      shouldTryFirecrawl = true;
    }

    if (shouldTryFirecrawl) {
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
        throw new Error(
          "Website has bot protection and Firecrawl API key is not configured. Please add FIRECRAWL_API_KEY to your environment variables.",
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

    let errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (
      errorMessage.includes("Failed to verify") ||
      errorMessage.includes("Code 10") ||
      errorMessage.includes("Cloudflare") ||
      errorMessage.includes("bot protection")
    ) {
      errorMessage =
        "This website has anti-bot protection (Cloudflare/Vercel) that prevents automatic cloning. Try a different page from the same website or contact support for assistance.";
    } else if (errorMessage.includes("timeout")) {
      errorMessage =
        "The website took too long to respond. Please try again or try a different page.";
    } else if (
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("DNS")
    ) {
      errorMessage = "Website not found. Please check the URL and try again.";
    } else if (
      errorMessage.includes("403") ||
      errorMessage.includes("Forbidden")
    ) {
      errorMessage =
        "Access to this website is restricted. The site may block automated access.";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
