import { getSubscription } from "@/app/supabase-server";
import { getURL } from "@/utils/helpers";
import { stripe } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const { type = "account_onboarding" } = await req.json();

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
          error: "Premium subscription required for Stripe account management",
        }),
        { status: 403 },
      );
    }

    // Get user's Stripe account
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (!userData?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "No Stripe account found" }),
        { status: 404 },
      );
    }

    const baseUrl = getURL();
    let refreshUrl: string;
    let returnUrl: string;

    if (type === "account_onboarding") {
      refreshUrl = `${baseUrl}account/templates/stripe-onboarding?refresh=true`;
      returnUrl = `${baseUrl}account/templates/stripe-onboarding?success=true`;
    } else {
      // account_update
      refreshUrl = `${baseUrl}account/templates/listings`;
      returnUrl = `${baseUrl}account/templates/listings?updated=true`;
    }

    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripe_account_id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: type as "account_onboarding" | "account_update",
    });

    return new Response(
      JSON.stringify({
        url: accountLink.url,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Account link creation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 },
    );
  }
}
