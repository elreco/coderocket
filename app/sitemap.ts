import { createClient } from "@supabase/supabase-js";
import { MetadataRoute } from "next";

import { Database } from "@/types_db";
import { appUrl, buildAppUrl } from "@/utils/runtime-config";

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date().toISOString();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: buildAppUrl("/components"),
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: buildAppUrl("/deployed-sites"),
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: buildAppUrl("/pricing"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: buildAppUrl("/changelog"),
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: buildAppUrl("/faq"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: buildAppUrl("/terms"),
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: buildAppUrl("/privacy"),
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: buildAppUrl("/cookies"),
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: publicComponents } = await supabase
      .from("chats")
      .select("slug, created_at")
      .eq("is_private", false)
      .not("slug", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    const componentRoutes: MetadataRoute.Sitemap =
      publicComponents?.map((component) => ({
        url: buildAppUrl(`/components/${component.slug}`),
        lastModified: component.created_at || currentDate,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })) || [];

    return [...staticRoutes, ...componentRoutes];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticRoutes;
  }
}
