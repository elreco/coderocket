export enum EmailScenario {
  OnboardingWelcome = "onboarding-welcome",
  OnboardingTips = "onboarding-tips",
  OnboardingChallenge = "onboarding-challenge",
  WeeklyPulse = "weekly-pulse",
  ReactivationSoft = "reactivation-soft",
  ReactivationOffer = "reactivation-offer",
  MilestoneCelebrate = "milestone-celebrate",
}

export type ScenarioInput = {
  userName?: string;
  dashboardUrl?: string;
  templateUrl?: string;
  bonusUrl?: string;
  milestone?: string;
};

type ScenarioConfig = {
  subject: string;
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  previewText?: string;
};

const dashboardFallback = "https://www.coderocket.app/components";

export function buildScenarioConfig(
  scenario: EmailScenario,
  input: ScenarioInput = {},
): ScenarioConfig {
  const name = input.userName ?? "there";
  const dashboard = input.dashboardUrl ?? dashboardFallback;
  switch (scenario) {
    case EmailScenario.OnboardingWelcome:
      return {
        subject: "Welcome to your CodeRocket control tower",
        headline: "Your first component in under 5 minutes",
        body: `${name}, launch a new component inside CodeRocket and let it scaffold your UI.`,
        ctaText: "Open CodeRocket",
        ctaUrl: dashboard,
      };
    case EmailScenario.OnboardingTips:
      return {
        subject: "3 tips to ship faster with CodeRocket",
        headline: "Figma import and presets",
        body: `Connect Figma, import a frame, and let CodeRocket generate the base. Stack two presets to save even more time.`,
        ctaText: "View the tips",
        ctaUrl: input.templateUrl ?? dashboard,
      };
    case EmailScenario.OnboardingChallenge:
      return {
        subject: "Challenge: ship a complete component today",
        headline: "Challenge #1",
        body: `Pick a complex component, export it, and share it with your team. Earn 20 bonus credits when you do.`,
        ctaText: "Take the challenge",
        ctaUrl: dashboard,
      };
    case EmailScenario.WeeklyPulse:
      return {
        subject: "This week in CodeRocket",
        headline: "Product pulse",
        body: `Discover top templates, winning prompts, and the next CodeRocket release.`,
        ctaText: "Read the pulse",
        ctaUrl: dashboard,
      };
    case EmailScenario.ReactivationSoft:
      return {
        subject: "Still building with CodeRocket?",
        headline: "Jump back into your components",
        body: `${name}, it has been two weeks since we last saw you in CodeRocket. Your drafts are waiting for you.`,
        ctaText: "Reopen my drafts",
        ctaUrl: dashboard,
      };
    case EmailScenario.ReactivationOffer:
      return {
        subject: "Limited bonus to restart your stack",
        headline: "We built a boost for you",
        body: `${name}, grab extra credits and an exclusive template pack if you come back to CodeRocket today.`,
        ctaText: "Unlock my bonus",
        ctaUrl: input.bonusUrl ?? dashboard,
      };
    case EmailScenario.MilestoneCelebrate:
      return {
        subject: `Congrats on ${input.milestone ?? "your latest milestone"}`,
        headline: "We are celebrating your progress",
        body: `${name}, you just reached ${input.milestone ?? "a new milestone"} inside CodeRocket. Share your component and keep the momentum.`,
        ctaText: "Keep building in CodeRocket",
        ctaUrl: dashboard,
      };
    default:
      return {
        subject: "CodeRocket",
        headline: "Notification",
        body: "Catch up on everything new inside your CodeRocket workspace.",
        ctaText: "Open CodeRocket",
        ctaUrl: dashboard,
      };
  }
}
