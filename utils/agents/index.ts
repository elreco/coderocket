import { createAI, createStreamableUI, getMutableAIState } from "ai/rsc";
import React from "react";

import { scrapeWebsite } from "./website-scraper";

interface AgentState {
  websiteData: {
    url: string;
    images: Array<{
      url: string;
      alt: string;
      dimensions?: { width: number; height: number };
    }>;
    title: string;
    description: string;
  } | null;
}

// Define the agent with proper typing
export const websiteCloneAgent = createAI({
  initialAIState: {
    websiteData: null,
  } as AgentState,
  actions: {
    async scrapeWebsiteAndGetData(url: string) {
      const aiState = getMutableAIState();

      // UI updates for loading state
      const ui = createStreamableUI();
      ui.update(
        React.createElement(
          "div",
          { className: "animate-pulse" },
          "Cloning website...",
        ),
      );

      try {
        // Scrape website
        const data = await scrapeWebsite(url);

        // Update AI state
        aiState.update({
          websiteData: {
            url: data.url,
            images: data.images,
            title: data.title,
            description: data.description,
          },
        });

        // Update UI with success message
        ui.update(
          React.createElement("div", { className: "flex flex-col gap-2" }, [
            React.createElement(
              "div",
              { className: "font-medium text-green-600" },
              "Website scraped successfully!",
            ),
            React.createElement(
              "div",
              null,
              `Found ${data.images.length} images and captured page structure.`,
            ),
          ]),
        );

        return {
          websiteData: aiState.get().websiteData,
          scrapingSuccess: true,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Error scraping website:", error);

        // Update UI with error message
        ui.update(
          React.createElement(
            "div",
            { className: "text-red-500" },
            `Failed to scrape website. Error: ${error?.message || "Unknown error"}`,
          ),
        );

        return {
          websiteData: null,
          scrapingSuccess: false,
          error: error?.message || "Unknown error",
        };
      }
    },
  },
});
