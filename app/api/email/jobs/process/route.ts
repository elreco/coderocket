import { z } from "zod";

import { EmailScenario, ScenarioInput } from "@/utils/email/scenarios";
import { dispatchEmail } from "@/utils/email/send-email";
import { createClient } from "@/utils/supabase/server";

const payloadSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
});

const scenarioSet = new Set(Object.values(EmailScenario));
const maxAttempts = 5;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 100;
  return await processJobs(limit);
}

export async function POST(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = payloadSchema.safeParse(body);
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 100;
  return await processJobs(limit);
}

async function processJobs(limit: number) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data: jobs, error } = await supabase
    .from("email_jobs")
    .select("id,email,scenario,user_id,payload,attempts,status,scheduled_at")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
  const successes: string[] = [];
  const failures: Array<{ id: string; error: string; terminal: boolean }> = [];
  for (const job of jobs ?? []) {
    const { data: claimed, error: claimError } = await supabase
      .from("email_jobs")
      .update({
        status: "processing",
        attempts: (job.attempts ?? 0) + 1,
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id,email,scenario,user_id,payload,attempts")
      .single();
    if (claimError || !claimed) {
      continue;
    }
    if (!scenarioSet.has(claimed.scenario as EmailScenario)) {
      await supabase
        .from("email_jobs")
        .update({ status: "failed", last_error: "Unknown scenario" })
        .eq("id", claimed.id);
      failures.push({
        id: claimed.id,
        error: "Unknown scenario",
        terminal: true,
      });
      continue;
    }
    try {
      await dispatchEmail({
        to: claimed.email,
        scenario: claimed.scenario as EmailScenario,
        data: (claimed.payload ?? undefined) as ScenarioInput,
        userId: claimed.user_id ?? undefined,
      });
      await supabase
        .from("email_jobs")
        .update({ status: "sent", last_error: null, scheduled_at: nowIso })
        .eq("id", claimed.id);
      successes.push(claimed.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const attemptCount = claimed.attempts ?? 1;
      if (attemptCount >= maxAttempts) {
        await supabase
          .from("email_jobs")
          .update({ status: "failed", last_error: message })
          .eq("id", claimed.id);
        failures.push({ id: claimed.id, error: message, terminal: true });
      } else {
        const retryMinutes = Math.min(60, 2 ** attemptCount);
        const retryDate = new Date(
          Date.now() + retryMinutes * 60 * 1000,
        ).toISOString();
        await supabase
          .from("email_jobs")
          .update({
            status: "pending",
            last_error: message,
            scheduled_at: retryDate,
          })
          .eq("id", claimed.id);
        failures.push({ id: claimed.id, error: message, terminal: false });
      }
    }
  }
  return new Response(
    JSON.stringify({
      checked: jobs?.length ?? 0,
      sent: successes.length,
      successes,
      failures,
    }),
    { status: failures.length ? 207 : 200 },
  );
}
