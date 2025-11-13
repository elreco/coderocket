export const TOKENS_PER_ROCKET = 10_000;

export type PlanName = "free" | "starter" | "pro" | "enterprise";

export function tokensToRockets(tokens: number): number {
  return tokens / TOKENS_PER_ROCKET;
}

export function rocketsToTokens(rockets: number): number {
  return rockets * TOKENS_PER_ROCKET;
}

export function formatRockets(rockets: number): string {
  if (rockets >= 1000) {
    return `${(rockets / 1000).toFixed(1)}K`;
  }
  return rockets.toFixed(0);
}

export const ROCKET_LIMITS_PER_PLAN = {
  free: {
    monthly_rockets: 5,
    description: "up to 20 generations per month",
  },
  starter: {
    monthly_rockets: 45,
    description: "up to 180 generations per month",
  },
  pro: {
    monthly_rockets: 90,
    description: "up to 360 generations per month",
  },
  enterprise: {
    monthly_rockets: 600,
    description: "up to 2,400 generations per month",
  },
};

export function getPlanRocketLimits(planName: string): {
  monthly_rockets: number;
  description: string;
} {
  const normalizedPlan = planName.toLowerCase();

  if (
    normalizedPlan.includes("enterprise") ||
    normalizedPlan.includes("entreprise")
  ) {
    return ROCKET_LIMITS_PER_PLAN.enterprise;
  }
  if (normalizedPlan.includes("pro")) {
    return ROCKET_LIMITS_PER_PLAN.pro;
  }
  if (normalizedPlan.includes("starter")) {
    return ROCKET_LIMITS_PER_PLAN.starter;
  }
  return ROCKET_LIMITS_PER_PLAN.free;
}
