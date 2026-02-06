import { getSubscription } from "@/app/supabase-server";
import { tokensToRockets } from "@/utils/rocket-conversion";
import { createClient } from "@/utils/supabase/server";

const escapeCsv = (value: string | number | null | undefined): string => {
  const stringValue =
    value === null || value === undefined ? "" : String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscription = await getSubscription(user.id);
  let periodStart: Date;
  let periodEnd: Date;

  if (subscription) {
    periodStart = new Date(subscription.current_period_start);
    periodEnd = new Date(subscription.current_period_end);
  } else {
    const today = new Date();
    periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  }

  const { data, error } = await supabase
    .from("token_usage_tracking")
    .select(
      "created_at, usage_type, input_tokens, output_tokens, cost_usd, model_used, chat_id, message_id",
    )
    .eq("user_id", user.id)
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", periodEnd.toISOString())
    .order("created_at", { ascending: true })
    .limit(5000);

  if (error) {
    console.error("Error generating usage report:", error);
    return new Response("Failed to generate report", { status: 500 });
  }

  const rows = data ?? [];
  const header = [
    "created_at",
    "usage_type",
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "rockets",
    "cost_usd",
    "model_used",
    "chat_id",
    "message_id",
  ];

  const lines = rows.map((row) => {
    const inputTokens = Number(row.input_tokens || 0);
    const outputTokens = Number(row.output_tokens || 0);
    const totalTokens = inputTokens + outputTokens;
    const rockets = tokensToRockets(totalTokens);

    return [
      row.created_at,
      row.usage_type ?? "",
      inputTokens,
      outputTokens,
      totalTokens,
      rockets.toFixed(4),
      row.cost_usd ?? "",
      row.model_used ?? "",
      row.chat_id ?? "",
      row.message_id ?? "",
    ]
      .map(escapeCsv)
      .join(",");
  });

  const csv = [header.join(","), ...lines].join("\n");
  const startLabel = periodStart.toISOString().slice(0, 10);
  const endLabel = periodEnd.toISOString().slice(0, 10);
  const filename = `coderocket-usage-${startLabel}-to-${endLabel}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
