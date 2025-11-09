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
    monthly_rockets: 60,
    description: "up to 240 generations per month",
  },
  pro: {
    monthly_rockets: 120,
    description: "up to 480 generations per month",
  },
  enterprise: {
    monthly_rockets: 800,
    description: "up to 3,200 generations per month",
  },
};

export function getPlanRocketLimits(planName: string): {
  monthly_rockets: number;
  description: string;
} {
  const normalizedPlan = planName.toLowerCase();

  if (normalizedPlan.includes("enterprise")) {
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
