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

    // Get user's Stripe account
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_account_id, stripe_onboarding_completed")
      .eq("id", user.id)
      .single();

    if (!userData?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "No Stripe account found" }),
        { status: 404 },
      );
    }

    if (!userData.stripe_onboarding_completed) {
      return new Response(
        JSON.stringify({ error: "Onboarding not completed" }),
        { status: 400 },
      );
    }

    // Create login link for Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(
      userData.stripe_account_id,
    );

    return new Response(
      JSON.stringify({
        url: loginLink.url,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Dashboard link creation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 },
    );
  }
}
