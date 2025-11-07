import { createClient } from "./supabase/server";

type ModelType = "claude-sonnet-4-5" | "claude-haiku-4-5";

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface PricingTiers {
  input: {
    base: number;
    extended?: number;
    threshold?: number;
  };
  output: {
    base: number;
    extended?: number;
    threshold?: number;
  };
  cacheCreation: number;
  cacheRead: number;
}

const MODEL_PRICING: Record<ModelType, PricingTiers> = {
  "claude-sonnet-4-5": {
    input: {
      base: 3,
      extended: 6,
      threshold: 200000,
    },
    output: {
      base: 15,
      extended: 22.5,
      threshold: 200000,
    },
    cacheCreation: 3.75,
    cacheRead: 0.3,
  },
  "claude-haiku-4-5": {
    input: {
      base: 1,
    },
    output: {
      base: 5,
    },
    cacheCreation: 1.25,
    cacheRead: 0.1,
  },
};

const MARGIN_MULTIPLIER = 1.75;

export function calculateTokenCost(
  usage: TokenUsage,
  model: ModelType,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    throw new Error(`Unknown model: ${model}`);
  }

  let inputCost = 0;
  let outputCost = 0;

  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
  const cacheReadTokens = usage.cache_read_input_tokens || 0;

  if (pricing.input.threshold && inputTokens > pricing.input.threshold) {
    inputCost =
      (pricing.input.threshold * pricing.input.base) / 1_000_000 +
      ((inputTokens - pricing.input.threshold) *
        (pricing.input.extended || pricing.input.base)) /
        1_000_000;
  } else {
    inputCost = (inputTokens * pricing.input.base) / 1_000_000;
  }

  if (pricing.output.threshold && outputTokens > pricing.output.threshold) {
    outputCost =
      (pricing.output.threshold * pricing.output.base) / 1_000_000 +
      ((outputTokens - pricing.output.threshold) *
        (pricing.output.extended || pricing.output.base)) /
        1_000_000;
  } else {
    outputCost = (outputTokens * pricing.output.base) / 1_000_000;
  }

  const cacheCreationCost =
    (cacheCreationTokens * pricing.cacheCreation) / 1_000_000;
  const cacheReadCost = (cacheReadTokens * pricing.cacheRead) / 1_000_000;

  const baseCost = inputCost + outputCost + cacheCreationCost + cacheReadCost;

  const costWithMargin = baseCost * MARGIN_MULTIPLIER;

  return Math.round(costWithMargin * 100000) / 100000;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(4)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

interface TokenUsageStats {
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
}

export async function getUserTokenUsage(
  userId: string,
  startDate: Date,
  endDate?: Date,
): Promise<TokenUsageStats> {
  const supabase = await createClient();

  let query = supabase
    .from("token_usage_tracking")
    .select("input_tokens, output_tokens, cost_usd")
    .eq("user_id", userId)
    .gte("created_at", startDate.toISOString());

  if (endDate) {
    query = query.lte("created_at", endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching token usage:", error);
    return {
      input_tokens: 0,
      output_tokens: 0,
      total_cost: 0,
    };
  }

  if (!data || data.length === 0) {
    return {
      input_tokens: 0,
      output_tokens: 0,
      total_cost: 0,
    };
  }

  const stats = data.reduce(
    (acc, row) => ({
      input_tokens: acc.input_tokens + Number(row.input_tokens || 0),
      output_tokens: acc.output_tokens + Number(row.output_tokens || 0),
      total_cost: acc.total_cost + Number(row.cost_usd || 0),
    }),
    { input_tokens: 0, output_tokens: 0, total_cost: 0 },
  );

  return stats;
}
