import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { createClient } from "@/utils/supabase/server";

import { StripeOnboardingClient } from "./stripe-onboarding-client";

export default async function StripeOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; refresh?: string }>;
}) {
  const params = await searchParams;
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
    redirect("/pricing?reason=templates-stripe");
  }

  // Get user's Stripe account status
  const { data: userData } = await supabase
    .from("users")
    .select(
      "stripe_account_id, stripe_account_status, stripe_onboarding_completed, stripe_payouts_enabled",
    )
    .eq("id", user.id)
    .single();

  const showSuccessMessage = params.success === "true";
  const needsRefresh = params.refresh === "true";

  return (
    <Container className="pr-2 sm:pr-11">
      <PageTitle
        title="Stripe Account Setup"
        subtitle="Set up your Stripe Express account to receive payments from template uses"
      />

      <Suspense fallback={<div>Loading...</div>}>
        <StripeOnboardingClient
          userData={userData}
          showSuccessMessage={showSuccessMessage}
          needsRefresh={needsRefresh}
        />
      </Suspense>
    </Container>
  );
}
