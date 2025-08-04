import { getSubscription } from "@/app/supabase-server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Check if user has premium subscription
    const subscription = await getSubscription();
    const isPremium = !!subscription;

    // Get user's Stripe account info
    const { data: userData } = await supabase
      .from("users")
      .select(
        "stripe_account_id, stripe_account_status, stripe_onboarding_completed, stripe_payouts_enabled",
      )
      .eq("id", user.id)
      .single();

    return new Response(
      JSON.stringify({
        hasAccount: !!userData?.stripe_account_id,
        onboardingComplete: userData?.stripe_onboarding_completed || false,
        payoutsEnabled: userData?.stripe_payouts_enabled || false,
        accountStatus: userData?.stripe_account_status || null,
        isPremium,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Account status check error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 },
    );
  }
}
