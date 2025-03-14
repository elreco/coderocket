import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

import { Tables } from "@/types_db";
import { createClient } from "@/utils/supabase/server";

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

export const avatarApi =
  "https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=";

export const STARTER_PLAN_MESSAGES_PER_PERIOD = 100;
export const PRO_PLAN_MESSAGES_PER_PERIOD = 300;
export const DEFAULT_MESSAGES_PER_PERIOD = 100;
export const TRIAL_PLAN_MESSAGES_PER_MONTH = 6;

export const MAX_SEARCH_LENGTH = 50;

export const MAX_TOKENS_PER_REQUEST = 6000;

// Fonction pour récupérer le nombre de messages supplémentaires disponibles pour un utilisateur
export const getExtraMessagesCount = async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("extra_messages")
    .select("count")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.count;
};

// Fonction pour décrémenter le compteur de messages supplémentaires
export const decrementExtraMessagesCount = async (userId: string) => {
  const supabase = await createClient();

  // Récupérer le nombre actuel de messages supplémentaires
  const { data, error } = await supabase
    .from("extra_messages")
    .select("count")
    .eq("user_id", userId)
    .single();

  if (error || !data || data.count <= 0) {
    return false;
  }

  // Décrémenter le compteur
  const { error: updateError } = await supabase
    .from("extra_messages")
    .update({
      count: data.count - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return !updateError;
};
