import { getSubscription } from "@/app/supabase-server";
import { tokensToRockets } from "@/utils/rocket-conversion";
import { createClient } from "@/utils/supabase/server";

const escapeCsv = (value: string | number | null | undefined): string => {
  const stringValue =
    value === null || value === undefined ? "" : String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
};

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscription = await getSubscription(user.id);
  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "current";
  let periodStart: Date;
  let periodEnd: Date;

  if (subscription) {
    const currentStart = new Date(subscription.current_period_start);
    const currentEnd = new Date(subscription.current_period_end);
    const previousEnd = new Date(currentStart);
    const previousStart = new Date(currentStart);
    previousStart.setMonth(previousStart.getMonth() - 1);

    if (period === "previous") {
      periodStart = previousStart;
      periodEnd = previousEnd;
    } else {
      periodStart = currentStart;
      periodEnd = currentEnd;
    }
  } else {
    const today = new Date();
    const currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const previousEnd = new Date(currentStart);
    const previousStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );

    if (period === "previous") {
      periodStart = previousStart;
      periodEnd = previousEnd;
    } else {
      periodStart = currentStart;
      periodEnd = currentEnd;
    }
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
