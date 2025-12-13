"use server";

import { createClient } from "@/utils/supabase/server";

export async function getUserDetails() {
  const supabase = await createClient();
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.id) return null;
    const email = data.user.email ?? null;
    const { data: userDetails } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();
    if (!userDetails) return null;
    return { ...userDetails, email };
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export async function getSubscription(userId?: string) {
  const supabase = await createClient();
  try {
    let targetUserId: string | undefined = userId;

    if (!targetUserId) {
      const { data } = await supabase.auth.getUser();
      if (!data.user?.id) return null;
      targetUserId = data.user.id;
    }

    if (!targetUserId) return null;

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*, prices(*, products(*))")
      .in("status", ["trialing", "active"])
      .eq("user_id", targetUserId)
      .maybeSingle()
      .throwOnError();

    if (subscription) {
      console.log(
        `[getSubscription] User ${targetUserId}: plan=${subscription.prices?.products?.name}, status=${subscription.status}`,
      );
    } else {
      console.log(
        `[getSubscription] User ${targetUserId}: No active subscription`,
      );
    }

    return subscription;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export const getActiveProductsWithPrices = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, prices(*)")
    .eq("active", true)
    .eq("prices.active", true)
    .order("metadata->index")
    .order("unit_amount", { referencedTable: "prices" });

  if (error) {
    console.log(error.message);
  }
  return data ?? [];
};
