import { getSubscription } from "@/app/supabase-server";
import { stripe } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const { amount_cents } = await req.json();

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
        JSON.stringify({ error: "Premium subscription required for payouts" }),
        { status: 403 },
      );
    }

    // Get user's Stripe account info
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_account_id, stripe_payouts_enabled")
      .eq("id", user.id)
      .single();

    if (!userData?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "No Stripe account found" }),
        { status: 404 },
      );
    }

    if (!userData.stripe_payouts_enabled) {
      return new Response(
        JSON.stringify({ error: "Payouts not enabled for this account" }),
        { status: 400 },
      );
    }

    // Get available earnings
    const { data: availableEarnings } = await supabase.rpc(
      "calculate_available_earnings",
      { seller_uuid: user.id },
    );

    if (!amount_cents || amount_cents <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payout amount" }), {
        status: 400,
      });
    }

    if (amount_cents > (availableEarnings || 0)) {
      return new Response(
        JSON.stringify({
          error: "Insufficient available earnings",
          available: availableEarnings,
        }),
        { status: 400 },
      );
    }

    // Get all payout earnings_ids for this seller to exclude them
    const { data: existingPayouts } = await supabase
      .from("marketplace_payouts")
      .select("earnings_ids")
      .eq("seller_id", user.id)
      .in("status", ["pending", "in_transit", "paid"]);

    const excludedEarningsIds = new Set(
      existingPayouts?.flatMap((p) => p.earnings_ids) || [],
    );

    // Get earnings records to include in payout
    const { data: allEarnings } = await supabase
      .from("marketplace_earnings")
      .select("id")
      .eq("seller_id", user.id)
      .eq("status", "available");

    // Filter out earnings that are already in a payout
    const earningsToPayOut =
      allEarnings?.filter((e) => !excludedEarningsIds.has(e.id)) || [];

    if (!earningsToPayOut || earningsToPayOut.length === 0) {
      return new Response(
        JSON.stringify({ error: "No available earnings found" }),
        { status: 400 },
      );
    }

    // Create payout in Stripe
    const payout = await stripe.transfers.create({
      amount: amount_cents,
      currency: "usd",
      destination: userData.stripe_account_id,
      description: `Marketplace earnings payout - ${new Date().toLocaleDateString()}`,
    });

    // Record payout in database
    const { data: payoutRecord, error: payoutError } = await supabase
      .from("marketplace_payouts")
      .insert({
        seller_id: user.id,
        amount_cents,
        currency: "USD",
        stripe_payout_id: payout.id,
        status: "pending",
        earnings_ids: earningsToPayOut.map((e) => e.id),
      })
      .select("id")
      .single();

    if (payoutError || !payoutRecord) {
      console.error("Failed to record payout:", payoutError);
      return new Response(
        JSON.stringify({ error: "Failed to record payout" }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payoutId: payoutRecord.id,
        stripeTransferId: payout.id,
        amount: amount_cents,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Payout creation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 },
    );
  }
}
