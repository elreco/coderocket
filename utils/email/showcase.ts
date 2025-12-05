import { createClient } from "@/utils/supabase/server";

import type { Highlight, FeaturedComponent } from "./template";

type RpcComponent = {
  chat_id: string;
  slug: string | null;
  framework: string | null;
  likes: number | null;
  created_at: string;
  title: string | null;
  user_full_name: string | null;
  last_assistant_message: string | null;
  is_private: boolean | null;
  is_featured: boolean | null;
};

const formatMetric = (likes: number | null) => {
  if (!likes || likes <= 0) return "Fresh drop";
  if (likes === 1) return "1 like";
  return `${likes} likes`;
};

const formatDescription = (record: RpcComponent) => {
  const framework = record.framework ? record.framework.toUpperCase() : "React";
  const maker = record.user_full_name ?? "Anonymous builder";
  return `${framework} · ${maker}`;
};

const componentUrl = (slug: string | null) =>
  slug ? `https://www.coderocket.app/components/${slug}` : undefined;

const previewHtmlFromRecord = (record: RpcComponent) => {
  const likes = record.likes ?? 0;
  const framework = record.framework ?? "React";
  return `<table role="presentation" width="100%" style="border-collapse:collapse">
  <tr>
    <td style="background:#191b2d;border-radius:16px;padding:20px;">
      <p style="margin:0 0 8px;font-size:13px;color:#8e92c3;letter-spacing:0.08em;text-transform:uppercase;">Framework</p>
      <p style="margin:0;font-size:24px;color:#f5f5ff;">${framework}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#7b80b2;">${formatMetric(likes)}</p>
    </td>
    <td style="width:16px;"></td>
    <td style="background:#191b2d;border-radius:16px;padding:20px;">
      <p style="margin:0;font-size:13px;color:#8e92c3;letter-spacing:0.08em;text-transform:uppercase;">Maker</p>
      <p style="margin:0;font-size:18px;color:#f5f5ff;">${record.user_full_name ?? "Community"}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#7b80b2;">${record.created_at ? new Date(record.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</p>
    </td>
  </tr>
</table>`;
};

export async function fetchEmailShowcase(): Promise<{
  highlights?: Highlight[];
  featured?: FeaturedComponent;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("get_chats_with_details")
      .not("last_assistant_message", "is", null)
      .is("is_private", false)
      .order("created_at", { ascending: false })
      .limit(4);
    if (error || !data) {
      console.error("Failed to fetch showcase components", error);
      return {};
    }
    if (data.length === 0) {
      return {};
    }
    const highlights: Highlight[] = data.slice(0, 3).map((record, index) => ({
      title: record.title ?? `Component ${index + 1}`,
      description: formatDescription(record),
      metric: formatMetric(record.likes),
      actionLabel: componentUrl(record.slug) ? "Open component" : undefined,
      actionUrl: componentUrl(record.slug),
      imageUrl: record.last_assistant_message,
    }));
    const featuredRecord = data[0];
    const featured: FeaturedComponent = {
      title: featuredRecord.title ?? "Latest component",
      description: `${formatDescription(featuredRecord)} · ${formatMetric(featuredRecord.likes)}`,
      badge: featuredRecord.likes
        ? `${formatMetric(featuredRecord.likes)}`
        : "New drop",
      previewHtml: previewHtmlFromRecord(featuredRecord),
      actionLabel: componentUrl(featuredRecord.slug)
        ? "Open in CodeRocket"
        : undefined,
      actionUrl: componentUrl(featuredRecord.slug),
      imageUrl: featuredRecord.last_assistant_message ?? undefined,
    };
    return {
      highlights,
      featured,
    };
  } catch (err) {
    console.error("Error building email showcase", err);
    return {};
  }
}
