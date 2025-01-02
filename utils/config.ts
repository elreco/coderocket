import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export const storageUrl =
  "https://jojdwiugelqhcajbccxn.supabase.co/storage/v1/object/public/images";

export const screenshotApiUrl =
  "https://screenshot-api-elreco.vercel.app/api?url=";

export const maxImageSize = 1 * 1024 * 1024; // 1 Mo

export const maxPromptLength = 500;

export const defaultTheme = "light";

export const openAINewModel = createOpenAI({
  name: "gpt-4o-mini",
  apiKey: process.env.OPEN_AI || "",
  compatibility: "strict",
});

export const anthropicModel = createAnthropic({
  apiKey:
    "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",
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
