import { redirect } from "next/navigation";

import { getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { createClient } from "@/utils/supabase/server";

import { EarningsClient } from "./earnings-client";

async function getUserEarningsData(userId: string) {
  const supabase = await createClient();

  // Get user's Stripe account info
  const { data: userStripeData } = await supabase
    .from("users")
    .select(
      "stripe_account_id, stripe_account_status, stripe_onboarding_completed, stripe_payouts_enabled",
    )
    .eq("id", userId)
    .single();

  // Get earnings
  const { data: earnings } = await supabase
    .from("marketplace_earnings")
    .select(
      `
      *,
      marketplace_purchases!purchase_id(
        listing_id,
        marketplace_listings!listing_id(
          title,
          price_cents
        )
      )
    `,
    )
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

  // Get payouts
  const { data: payouts } = await supabase
    .from("marketplace_payouts")
    .select("*")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

  // Get available earnings amount
  const { data: availableEarnings } = await supabase.rpc(
    "calculate_available_earnings",
    { seller_uuid: userId },
  );

  return {
    userStripeData,
    earnings: earnings || [],
    payouts: payouts || [],
    availableEarnings: availableEarnings || 0,
  };
}

export default async function EarningsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Check if user has premium subscription
  const subscription = await getSubscription();
  if (!subscription) {
    redirect("/pricing?reason=marketplace-earnings");
  }

  const data = await getUserEarningsData(user.id);

  return (
    <Container className="pr-2 sm:pr-11">
      <PageTitle
        title="Earnings & Payouts"
        subtitle="Track your marketplace earnings and manage payouts"
      />

      <EarningsClient
        userStripeData={data.userStripeData}
        earnings={data.earnings || []}
        payouts={data.payouts || []}
        availableEarnings={data.availableEarnings}
      />
    </Container>
  );
}
