import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

import { Tables } from "@/types_db";

export const storageUrl =
  "https://jojdwiugelqhcajbccxn.supabase.co/storage/v1/object/public/images";

export const screenshotApiUrl =
  "https://screenshot-api-elreco.vercel.app/api?url=";

export const discordLink = "https://discord.gg/t7dQgcYJ5t";

export const maxImageSize = 2 * 1024 * 1024; // 2 Mo

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

export const avatarApi = "https://api.dicebear.com/9.x/initials/svg?seed=";

export const STARTER_PLAN_MESSAGES_PER_PERIOD = 100;
export const PRO_PLAN_MESSAGES_PER_PERIOD = 300;
export const DEFAULT_MESSAGES_PER_PERIOD = 100;
export const TRIAL_PLAN_MESSAGES_PER_MONTH = 6;

export const MAX_SEARCH_LENGTH = 50;

export const MAX_TOKENS_PER_REQUEST = 6000;
export const CHAR_PER_TOKEN = 2;
export const MAX_ACCOUNTS_PER_IP = 1;

export const FREE_CHAR_LIMIT = 1500;
export const PREMIUM_CHAR_LIMIT = MAX_TOKENS_PER_REQUEST * CHAR_PER_TOKEN; // 12000 caractères

export const MAX_VERSIONS_PER_COMPONENT = 40;

export const getCharacterLimit = (
  subscription:
    | (Tables<"subscriptions"> & {
        prices: Partial<Tables<"prices">> | null;
      })
    | null,
) => {
  if (!subscription) {
    return FREE_CHAR_LIMIT;
  }
  return PREMIUM_CHAR_LIMIT;
};
