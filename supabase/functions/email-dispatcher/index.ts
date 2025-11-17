import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const endpoint =
  Deno.env.get("EMAIL_DISPATCH_URL") ??
  "https://www.coderocket.app/api/email/dispatch";
const apiKey = Deno.env.get("EMAIL_DISPATCH_KEY");

type RecipientPayload = {
  to: string;
  scenario: string;
  data?: Record<string, unknown>;
  userId?: string;
};

type SupabaseAuthHookPayload = {
  type: string;
  table: string;
  record: {
    id: string;
    email?: string;
    raw_user_meta_data?: {
      full_name?: string;
    };
  };
  old_record: unknown;
};

const requestHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
};

const callDispatcher = async (payload: RecipientPayload) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(body || "Dispatch failed");
  }
  return body;
};

const isSupabaseAuthHook = (body: unknown): body is SupabaseAuthHookPayload => {
  return (
    typeof body === "object" &&
    body !== null &&
    "type" in body &&
    "table" in body &&
    "record" in body &&
    typeof (body as SupabaseAuthHookPayload).type === "string" &&
    (body as SupabaseAuthHookPayload).table === "auth.users"
  );
};

const extractRecipientsFromAuthHook = (
  hookPayload: SupabaseAuthHookPayload,
): RecipientPayload[] => {
  if (hookPayload.type === "user.created" && hookPayload.record.email) {
    const userName =
      hookPayload.record.raw_user_meta_data?.full_name ||
      hookPayload.record.email.split("@")[0];
    return [
      {
        to: hookPayload.record.email,
        scenario: "onboarding-welcome",
        userId: hookPayload.record.id,
        data: {
          userName,
        },
      },
    ];
  }
  return [];
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }
  try {
    const body = await req.json();
    let recipients: RecipientPayload[] = [];

    if (isSupabaseAuthHook(body)) {
      recipients = extractRecipientsFromAuthHook(body);
    } else {
      recipients = Array.isArray(body.recipients)
        ? body.recipients
        : body.to && body.scenario
          ? [
              {
                to: body.to,
                scenario: body.scenario,
                data: body.data,
                userId: body.userId,
              },
            ]
          : [];
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing recipients payload" }),
        { status: 400 },
      );
    }
    const results = [];
    for (const recipient of recipients) {
      const result = await callDispatcher(recipient);
      results.push({ to: recipient.to, status: "sent", response: result });
    }
    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
