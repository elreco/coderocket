import { z } from "zod";
import { EmailScenario } from "@/utils/email/scenarios";
import { dispatchEmail } from "@/utils/email/send-email";

const dataSchema = z
  .object({
    userName: z.string().optional(),
    dashboardUrl: z.string().url().optional(),
    templateUrl: z.string().url().optional(),
    bonusUrl: z.string().url().optional(),
    milestone: z.string().optional(),
  })
  .optional();

const payloadSchema = z.object({
  to: z.string().email(),
  scenario: z.nativeEnum(EmailScenario),
  data: dataSchema,
  userId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      headers: { Allow: "POST" },
      status: 405,
    });
  }
  try {
    const body = await req.json();
    const payload = payloadSchema.parse(body);
    const result = await dispatchEmail({
      to: payload.to,
      scenario: payload.scenario,
      data: payload.data ?? undefined,
      userId: payload.userId,
    });
    return new Response(
      JSON.stringify({
        id: result.data?.id ?? null,
        status: result.data?.createdAt ? "queued" : "pending",
      }),
      { status: 200 },
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

