import { z } from "zod";

import { EmailScenario } from "@/utils/email/scenarios";
import {
  emailSegmentIds,
  resolveSegmentRecipients,
} from "@/utils/email/segments";
import { dispatchEmail } from "@/utils/email/send-email";

const payloadSchema = z.object({
  segment: z.enum(emailSegmentIds),
  limit: z.number().min(1).max(1000).optional(),
  scenarioOverride: z.nativeEnum(EmailScenario).optional(),
  dryRun: z.boolean().optional(),
});

export async function GET(req: Request) {
  const cronHeader = req.headers.get("x-vercel-cron");
  if (cronHeader !== "1") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  const url = new URL(req.url);
  const segment = url.searchParams.get("segment");
  const limitParam = url.searchParams.get("limit");
  const dryRunParam = url.searchParams.get("dryRun");

  if (!segment) {
    return new Response(
      JSON.stringify({ error: "Missing segment parameter" }),
      { status: 400 },
    );
  }

  const input = payloadSchema.parse({
    segment,
    limit: limitParam ? parseInt(limitParam, 10) : undefined,
    dryRun: dryRunParam === "true",
  });

  return await processSegment(input);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = payloadSchema.parse(body);
    return await processSegment(input);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 400 },
    );
  }
}

async function processSegment(input: z.infer<typeof payloadSchema>) {
  try {
    const { users, scenario: defaultScenario } = await resolveSegmentRecipients(
      input.segment,
      input.limit,
    );
    const scenario = input.scenarioOverride ?? defaultScenario;
    if (users.length === 0) {
      return new Response(
        JSON.stringify({
          segment: input.segment,
          scenario,
          dispatched: 0,
          dryRun: Boolean(input.dryRun),
        }),
        { status: 200 },
      );
    }
    if (input.dryRun) {
      return new Response(
        JSON.stringify({
          segment: input.segment,
          scenario,
          dispatched: 0,
          sample: users.slice(0, 10),
          totalCandidates: users.length,
          dryRun: true,
        }),
        { status: 200 },
      );
    }
    const successes: Array<{ userId: string; to: string }> = [];
    const failures: Array<{ userId: string; to: string; error: string }> = [];
    for (const user of users) {
      try {
        const userName =
          user.full_name ??
          (user.email?.includes("@") ? user.email.split("@")[0] : undefined);
        await dispatchEmail({
          to: user.email!,
          scenario,
          data: userName ? { userName } : undefined,
          userId: user.id,
        });
        successes.push({ userId: user.id, to: user.email! });
      } catch (error) {
        failures.push({
          userId: user.id,
          to: user.email!,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    return new Response(
      JSON.stringify({
        segment: input.segment,
        scenario,
        dispatched: successes.length,
        failures,
      }),
      { status: failures.length ? 207 : 200 },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 400 },
    );
  }
}
