"use server";

import { scrapeWebsiteSimple } from "@/utils/agents/website-scraper-simple";

export async function cloneWebsite(url: string) {
  try {
    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`🚀 Starting website clone: ${url}`);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Clone timeout after 2 minutes")),
        120000,
      );
    });

    const scraping = scrapeWebsiteSimple(url);
    const websiteData = await Promise.race([scraping, timeout]);

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
        contentToCheck.includes(indicator) || titleToCheck.includes(indicator),
    );

    if (hasProtection) {
      throw new Error(
        "This website has anti-bot protection (Cloudflare/Vercel) that prevents automatic cloning.",
      );
    }

    console.log("✅ Scraping successful:", {
      title: websiteData.title,
      hasMarkdown: !!websiteData.markdown,
      hasScreenshot: !!websiteData.screenshot,
      imagesFound: websiteData.images?.length || 0,
      hasDesignMetadata: !!websiteData.designMetadata,
      animationLibrary: websiteData.designMetadata?.animationLibrary || null,
    });

    return {
      success: true,
      data: websiteData,
      method: "remote",
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
