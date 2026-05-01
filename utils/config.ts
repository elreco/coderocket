import { Tables } from "@/types_db";
import {
  avatarApi,
  discordLink,
  gaId,
  storageUrl,
} from "@/utils/runtime-config";

export { avatarApi, discordLink, gaId, storageUrl };

export const maxImageSize = 10 * 1024 * 1024;
export const maxPdfSize = 32 * 1024 * 1024;
export const maxImagesUpload = 20;

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

export const defaultTheme = "light";

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

export const MAX_SEARCH_LENGTH = 50;
export const MAX_TOKENS_PER_REQUEST = 32000;
export const MAX_ACCOUNTS_PER_IP = 5;
export const CHAR_PER_TOKEN = 2;
export const FREE_CHAR_LIMIT = 1500;
export const PREMIUM_CHAR_LIMIT = 8000 * CHAR_PER_TOKEN;
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

export const FILE_LIMITS_PER_PLAN = {
  starter: 10,
  pro: 50,
  enterprise: Infinity,
  free: 0,
};

export const getMaxFilesLimit = (
  subscription:
    | (Tables<"subscriptions"> & {
        prices:
          | (Partial<Tables<"prices">> & {
              products: Partial<Tables<"products">> | null;
            })
          | null;
      })
    | null,
): number => {
  if (!subscription?.prices?.products?.name) {
    return FILE_LIMITS_PER_PLAN.free;
  }

  const planName = subscription.prices.products.name.toLowerCase();

  if (planName.includes("enterprise") || planName.includes("entreprise")) {
    return FILE_LIMITS_PER_PLAN.enterprise;
  }
  if (planName.includes("pro")) {
    return FILE_LIMITS_PER_PLAN.pro;
  }
  if (planName.includes("starter")) {
    return FILE_LIMITS_PER_PLAN.starter;
  }

  return FILE_LIMITS_PER_PLAN.free;
};
