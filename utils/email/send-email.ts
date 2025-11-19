import { Resend } from "resend";

import { createClient } from "@/utils/supabase/server";

import { buildScenarioConfig, EmailScenario, ScenarioInput } from "./scenarios";
import { fetchEmailShowcase } from "./showcase";
import { renderEmailTemplate } from "./template";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromAddress =
  process.env.RESEND_FROM_ADDRESS ?? "CodeRocket <hello@mail.coderocket.app>";

type DispatchOptions = {
  to: string;
  scenario: EmailScenario;
  data?: ScenarioInput;
  userId?: string;
};

export async function dispatchEmail({
  to,
  scenario,
  data,
  userId,
}: DispatchOptions) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const config = buildScenarioConfig(scenario, data);
  const showcase = await fetchEmailShowcase();
  const html = renderEmailTemplate({
    headline: config.headline,
    body: config.body,
    ctaText: config.ctaText,
    ctaUrl: config.ctaUrl,
    previewText: config.previewText,
    highlights: showcase.highlights,
    featuredComponent: showcase.featured,
  });
  const text = `${config.headline}\n\n${config.body}\n\n${config.ctaText}: ${config.ctaUrl}`;
  const response = await resend.emails.send({
    from: fromAddress,
    to,
    subject: config.subject,
    html,
    text,
  });
  if (response.error) {
    throw new Error(response.error.message ?? "Failed to send email");
  }
  if (userId) {
    await updateUserEmailMetadata(userId, scenario);
  }
  return response;
}

async function updateUserEmailMetadata(
  userId: string,
  scenario: EmailScenario,
) {
  try {
    const supabase = await createClient();
    await supabase
      .from("users")
      .update({
        last_email_scenario: scenario,
        last_email_sent_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } catch (error) {
    console.error("Failed to update user email metadata", error);
  }
}
