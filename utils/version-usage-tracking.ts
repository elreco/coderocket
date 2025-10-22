import { createClient } from "@/utils/supabase/server";

export type UsageType = "component";

/**
 * Track version usage for accurate pricing calculations
 * Only tracks real AI requests (component creation and iterations)
 */
export async function trackVersionUsage(
  userId: string,
  chatId: string,
  version: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("version_usage_tracking").upsert(
      {
        user_id: userId,
        chat_id: chatId,
        version: version,
        usage_type: "component",
      },
      {
        onConflict: "user_id,chat_id,version,usage_type",
      },
    );

    if (error) {
      console.error("Error tracking version usage:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error tracking version usage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get user usage count for current period (replaces the old message counting)
 */
export async function getUserUsageCount(
  userId: string,
  startDate: Date,
  endDate?: Date,
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("version_usage_tracking")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString());

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { count, error } = await query;

    if (error) {
      console.error("Error fetching usage count:", error);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error("Error fetching usage count:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get usage breakdown by type for analytics
 */
export async function getUserUsageBreakdown(
  userId: string,
  startDate: Date,
  endDate?: Date,
): Promise<{
  success: boolean;
  breakdown: Record<UsageType, number>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("version_usage_tracking")
      .select("usage_type")
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString());

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching usage breakdown:", error);
      return {
        success: false,
        breakdown: { component: 0 },
        error: error.message,
      };
    }

    // Since we only track 'component' usage, return the total count
    const componentCount = data?.length || 0;
    const breakdown = { component: componentCount };

    return { success: true, breakdown };
  } catch (error) {
    console.error("Error fetching usage breakdown:", error);
    return {
      success: false,
      breakdown: { component: 0 },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
