import { getSubscription } from "@/app/supabase-server";
import { getURL } from "@/utils/helpers";
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

    // Check if user has premium subscription
    const subscription = await getSubscription();
    if (!subscription) {
      return new Response(
        JSON.stringify({
          error: "Premium subscription required to create seller account",
        }),
        { status: 403 },
      );
    }

    // Check if user already has a Stripe account
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_account_id, stripe_account_status")
      .eq("id", user.id)
      .single();

    if (userData?.stripe_account_id) {
      // User already has a Stripe account, create account link instead
      try {
        const baseUrl = getURL();
        const accountLink = await stripe.accountLinks.create({
          account: userData.stripe_account_id,
          refresh_url: `${baseUrl}account/templates/stripe-onboarding?error=refresh_needed`,
          return_url: `${baseUrl}account/templates/stripe-onboarding?success=true`,
          type: "account_onboarding",
        });

        return new Response(
          JSON.stringify({ accountLinkUrl: accountLink.url }),
          { status: 200 },
        );
      } catch (linkError) {
        console.error("Error creating account link:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to create account link" }),
          { status: 500 },
        );
      }
    }

    console.log(
      "Creating Stripe account - letting user choose country in Stripe form",
    );

    // Create Stripe Express account without specifying country or capabilities
    // This allows Stripe to ask the user for their country during onboarding
    // Capabilities will be automatically requested based on the selected country
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      business_profile: {
        product_description: "Digital components and templates marketplace",
        mcc: "5734", // Computer Software Stores
      },
    });

    // Update user with Stripe account info
    const { error: updateError } = await supabase
      .from("users")
      .update({
        stripe_account_id: account.id,
        stripe_account_status: "pending",
        stripe_onboarding_completed: false,
        stripe_payouts_enabled: false,
        stripe_charges_enabled: false,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update user with Stripe account:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save account information" }),
        { status: 500 },
      );
    }

    // Create account link for onboarding
    const baseUrl = getURL();
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}account/templates/stripe-onboarding?refresh=true`,
      return_url: `${baseUrl}account/templates/stripe-onboarding?success=true`,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({
        accountId: account.id,
        accountLinkUrl: accountLink.url,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Stripe Connect account creation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 },
    );
  }
}
