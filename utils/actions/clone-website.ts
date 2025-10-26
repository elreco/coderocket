"use server";

import { scrapeWebsiteWithFirecrawl } from "@/utils/agents/website-scraper-firecrawl";

/**
 * Server Action qui clone un site web en récupérant son contenu via scraping
 * Optimisé pour une meilleure fidélité tout en simplifiant le processus
 */
export async function cloneWebsite(url: string) {
  try {
    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`Début du clonage du site avec Firecrawl: ${url}`);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Clonage timeout après 120 secondes")),
        120000,
      );
    });

    const scraping = scrapeWebsiteWithFirecrawl(url);
    const websiteData = await Promise.race([scraping, timeout]);

    console.log("Firecrawl scraping successful");

    return {
      success: true,
      data: {
        title: websiteData.title,
        description: websiteData.description,
        url: websiteData.url,
        html: websiteData.html,
        markdown: websiteData.markdown,
        screenshot: websiteData.screenshot,
        metaTags: websiteData.metaTags || {},
      },
    };
  } catch (error) {
    console.error("Error in cloneWebsite server action:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
