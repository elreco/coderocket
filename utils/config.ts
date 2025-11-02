import { createAnthropic } from "@ai-sdk/anthropic";

import { Tables } from "@/types_db";

export const storageUrl =
  "https://jojdwiugelqhcajbccxn.supabase.co/storage/v1/object/public/images";

export const screenshotApiUrl =
  "https://screenshot-api-elreco.vercel.app/api?url=";

export const discordLink = "https://discord.gg/t7dQgcYJ5t";

export const maxImageSize = 10 * 1024 * 1024; // 10 Mo
export const maxPdfSize = 32 * 1024 * 1024; // 32 Mo (Anthropic limit)
export const maxImagesUpload = 5;

export const supportedImageTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];

export const supportedDocumentTypes = ["application/pdf"];

export const supportedTextTypes = ["text/plain"];

export const supportedFileTypes = [
  ...supportedImageTypes,
  ...supportedDocumentTypes,
  ...supportedTextTypes,
];

export const fileTypeConfig = {
  image: {
    maxSize: maxImageSize,
    accept: ".png, .jpeg, .jpg, .gif, .webp",
    types: supportedImageTypes,
  },
  pdf: {
    maxSize: maxPdfSize,
    accept: ".pdf",
    types: supportedDocumentTypes,
  },
  text: {
    maxSize: maxPdfSize,
    accept: ".txt",
    types: supportedTextTypes,
  },
};

export const MAX_ITERATIONS = 4;

export const MAX_GENERATIONS = 5;

export const defaultTheme = "light";

export const gaId = "G-0HBMKNN8MQ";

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
  SVELTE = "svelte",
  ANGULAR = "angular",
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

export const MAX_TOKENS_PER_REQUEST = 32000; // Reduced from 64000 to prevent context overflow
export const CHAR_PER_TOKEN = 2;
export const MAX_ACCOUNTS_PER_IP = 5;

export const FREE_CHAR_LIMIT = 1500;
export const PREMIUM_CHAR_LIMIT = 8000 * CHAR_PER_TOKEN; // 12000 caractères

export const MAX_VERSIONS_PER_COMPONENT = 70;

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
