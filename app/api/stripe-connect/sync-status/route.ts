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

    // Check if we need to request capabilities for marketplace functionality
    const cardPayments = account.capabilities?.card_payments;
    const transfers = account.capabilities?.transfers;

    const needsCapabilities =
      !cardPayments ||
      !transfers ||
      cardPayments === "inactive" ||
      transfers === "inactive";

    // If the account has a country but missing capabilities, request them
    if (account.country && needsCapabilities) {
      console.log(
        `Requesting missing capabilities for account ${account.id} in ${account.country}`,
      );

      try {
        await stripe.accounts.update(userData.stripe_account_id, {
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

        // Fetch updated account
        const updatedAccount = await stripe.accounts.retrieve(
          userData.stripe_account_id,
        );

        // Update user's Stripe account status with updated info
        const { error: updateError } = await supabase
          .from("users")
          .update({
            stripe_account_status: updatedAccount.charges_enabled
              ? "enabled"
              : updatedAccount.details_submitted
                ? "restricted"
                : "pending",
            stripe_onboarding_completed: updatedAccount.details_submitted,
            stripe_payouts_enabled: updatedAccount.payouts_enabled,
            stripe_charges_enabled: updatedAccount.charges_enabled,
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
            capabilitiesUpdated: true,
            status: {
              charges_enabled: updatedAccount.charges_enabled,
              details_submitted: updatedAccount.details_submitted,
              payouts_enabled: updatedAccount.payouts_enabled,
            },
          }),
          { status: 200 },
        );
      } catch (capabilityError) {
        console.error("Failed to request capabilities:", capabilityError);
        // Continue with normal flow even if capability request fails
      }
    }

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
