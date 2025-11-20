"use server";

import { builderApiUrl } from "@/utils/config";

interface WebsiteContent {
  html: string;
  markdown: string;
  title: string;
  description: string | null;
  url: string;
  screenshot: string;
  images: Array<{
    url: string;
    alt: string;
    isLogo: boolean;
  }>;
}

const SCRAPER_ENDPOINT = `${builderApiUrl}/scrape-simple`;

export async function scrapeWebsiteSimple(
  url: string,
): Promise<WebsiteContent> {
  if (!SCRAPER_ENDPOINT) {
    throw new Error(
      "Scraper endpoint is not configured. Please set WEBSITE_SCRAPER_URL or BUILDER_URL.",
    );
  }

  const response = await fetch(SCRAPER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`Remote scraper responded with status ${response.status}`);
  }

  const payload = await response.json();

  if (payload?.success === false) {
    throw new Error(payload?.error || "Remote scraper failed");
  }

  const data = payload?.data ?? payload;

  if (!data || typeof data !== "object") {
    throw new Error("Remote scraper returned an invalid payload");
  }

  return {
    html: data.html ?? "",
    markdown: data.markdown ?? "",
    title: data.title ?? "",
    description: data.description ?? null,
    url: data.url ?? url,
    screenshot: data.screenshot ?? "",
    images: Array.isArray(data.images) ? data.images : [],
  };
}
