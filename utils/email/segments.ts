import { differenceInDays, subDays } from "date-fns";

import { Database } from "@/types_db";
import { createClient } from "@/utils/supabase/server";

import { EmailScenario } from "./scenarios";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export const emailSegmentIds = [
  "onboarding-day2",
  "onboarding-day5",
  "reactivation-14d",
  "reactivation-30d",
  "weekly-pulse",
] as const;

export type EmailSegmentId = (typeof emailSegmentIds)[number];

type SegmentDefinition = {
  scenario: EmailScenario;
  defaultLimit: number;
  createdDaysAgoRange?: { min: number; max: number };
  minAccountAgeDays?: number;
  cooldownDays?: number;
  excludeScenarios?: EmailScenario[];
};

const segmentMap: Record<EmailSegmentId, SegmentDefinition> = {
  "onboarding-day2": {
    scenario: EmailScenario.OnboardingTips,
    defaultLimit: 500,
    createdDaysAgoRange: { min: 2, max: 3 },
    cooldownDays: 1,
    excludeScenarios: [EmailScenario.OnboardingTips],
  },
  "onboarding-day5": {
    scenario: EmailScenario.OnboardingChallenge,
    defaultLimit: 500,
    createdDaysAgoRange: { min: 5, max: 6 },
    cooldownDays: 1,
    excludeScenarios: [EmailScenario.OnboardingChallenge],
  },
  "reactivation-14d": {
    scenario: EmailScenario.ReactivationSoft,
    defaultLimit: 500,
    minAccountAgeDays: 14,
    cooldownDays: 14,
    excludeScenarios: [EmailScenario.ReactivationSoft],
  },
  "reactivation-30d": {
    scenario: EmailScenario.ReactivationOffer,
    defaultLimit: 500,
    minAccountAgeDays: 30,
    cooldownDays: 30,
    excludeScenarios: [EmailScenario.ReactivationOffer],
  },
  "weekly-pulse": {
    scenario: EmailScenario.WeeklyPulse,
    defaultLimit: 500,
    cooldownDays: 7,
    excludeScenarios: [EmailScenario.WeeklyPulse],
  },
};

type SegmentResult = {
  users: Array<Required<Pick<UserRow, "id" | "email">> & Pick<UserRow, "full_name">>;
  scenario: EmailScenario;
};

export async function resolveSegmentRecipients(
  segmentId: EmailSegmentId,
  limit?: number,
): Promise<SegmentResult> {
  const definition = segmentMap[segmentId];
  if (!definition) {
    throw new Error("Unknown segment");
  }
  const supabase = await createClient();
  const now = new Date();
  const maxLimit = Math.min(Math.max(limit ?? definition.defaultLimit, 1), 1000);
  const fetchLimit = Math.min(maxLimit * 3, 3000);
  let query = supabase
    .from("users")
    .select(
      "id,email,full_name,last_email_scenario,last_email_sent_at,created_at",
    )
    .not("email", "is", null)
    .order("created_at", { ascending: true })
    .limit(fetchLimit);

  if (definition.createdDaysAgoRange) {
    const upperBound = subDays(now, definition.createdDaysAgoRange.min).toISOString();
    const lowerBound = subDays(now, definition.createdDaysAgoRange.max).toISOString();
    query = query.gte("created_at", lowerBound).lte("created_at", upperBound);
  } else if (definition.minAccountAgeDays) {
    const cutoff = subDays(now, definition.minAccountAgeDays).toISOString();
    query = query.lte("created_at", cutoff);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  const filtered =
    data?.filter((user) => filterUser(user, definition, now)).slice(0, maxLimit) ??
    [];
  return {
    users: filtered.map((user) => ({
      id: user.id,
      email: user.email!,
      full_name: user.full_name,
    })),
    scenario: definition.scenario,
  };
}

function filterUser(
  user: UserRow,
  definition: SegmentDefinition,
  now: Date,
): boolean {
  if (!user.email) {
    return false;
  }
  if (
    (definition.createdDaysAgoRange || definition.minAccountAgeDays) &&
    !user.created_at
  ) {
    return false;
  }
  if (definition.excludeScenarios?.length && user.last_email_scenario) {
    if (
      definition.excludeScenarios.includes(
        user.last_email_scenario as EmailScenario,
      )
    ) {
      return false;
    }
  }
  if (definition.cooldownDays && user.last_email_sent_at) {
    const sinceLastEmail = differenceInDays(now, new Date(user.last_email_sent_at));
    if (sinceLastEmail < definition.cooldownDays) {
      return false;
    }
  }
  if (definition.createdDaysAgoRange && user.created_at) {
    const age = differenceInDays(now, new Date(user.created_at));
    if (
      age < definition.createdDaysAgoRange.min ||
      age >= definition.createdDaysAgoRange.max
    ) {
      return false;
    }
  }
  if (definition.minAccountAgeDays && user.created_at) {
    const age = differenceInDays(now, new Date(user.created_at));
    if (age < definition.minAccountAgeDays) {
      return false;
    }
  }
  return true;
}

