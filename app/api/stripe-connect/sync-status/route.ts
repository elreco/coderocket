import { stripe } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
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

    // Get user's Stripe account info
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (!userData?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "No Stripe account found" }),
        {
          status: 404,
        },
      );
    }

    // Fetch account from Stripe
    const account = await stripe.accounts.retrieve(userData.stripe_account_id);

    // Update user's Stripe account status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        stripe_account_status: account.charges_enabled
          ? "enabled"
          : account.details_submitted
            ? "restricted"
            : "pending",
        stripe_onboarding_completed: account.details_submitted,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_charges_enabled: account.charges_enabled,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(
        "Failed to update user Stripe account status:",
        updateError,
      );
      return new Response(
        JSON.stringify({ error: "Failed to update account status" }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: {
          charges_enabled: account.charges_enabled,
          details_submitted: account.details_submitted,
          payouts_enabled: account.payouts_enabled,
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Sync status error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 },
    );
  }
}
