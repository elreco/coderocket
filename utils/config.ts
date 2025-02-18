import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

import { Tables } from "@/types_db";

export const storageUrl =
  "https://jojdwiugelqhcajbccxn.supabase.co/storage/v1/object/public/images";

export const screenshotApiUrl =
  "https://screenshot-api-elreco.vercel.app/api?url=";

export const discordLink = "https://discord.gg/t7dQgcYJ5t";

export const maxImageSize = 1 * 1024 * 1024; // 1 Mo

export const MAX_ITERATIONS = 4;

export const MAX_GENERATIONS = 5;

export const defaultTheme = "light";

export const gaId = "G-0HBMKNN8MQ";

export const openAINewModel = createOpenAI({
  name: "gpt-4o-mini",
  apiKey: process.env.OPEN_AI || "",
  compatibility: "strict",
});

export const anthropicModel = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export const crispWebsiteId = "2f740c23-7cfa-40ff-ba55-581ff73c5a67";

export const themes = [
  "light",
  "dark",
  "cupcake",
  "retro",
  "sunset",
  "night",
  "winter",
  "cyberpunk",
  "autumn",
  "dracula",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "halloween",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "coffee",
  "acid",
  "lemonade",
  "business",
  "cmyk",
];

export enum Framework {
  REACT = "react",
  VUE = "vue",
  HTML = "html",
  SVELTE = "svelte",
}

export const getMaxMessagesPerPeriod = (
  subscription: Tables<"subscriptions"> & {
    prices: Partial<Tables<"prices">> | null;
  },
) => {
  if (subscription.custom_messages_per_period) {
    return subscription.custom_messages_per_period;
  }

  switch (subscription.prices?.description) {
    case "Starter":
      return STARTER_PLAN_MESSAGES_PER_PERIOD;
    case "Pro":
      return PRO_PLAN_MESSAGES_PER_PERIOD;
    default:
      return DEFAULT_MESSAGES_PER_PERIOD;
  }
};

export const builderApiUrl = "https://react-builder.fly.dev";

export const STARTER_PLAN_MESSAGES_PER_PERIOD = 1000;
export const PRO_PLAN_MESSAGES_PER_PERIOD = 2500;
export const DEFAULT_MESSAGES_PER_PERIOD = 2500;
export const TRIAL_PLAN_MESSAGES_PER_DAY = 10;
