import { stripe } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";
import { createOrRetrieveCustomer } from "@/utils/supabase-admin";

export async function POST(req: Request) {
  try {
    const {
      listingId,
      sellerId,
      chatId,
      version,
      priceCents,
      platformCommissionCents,
      sellerEarningCents,
      productName,
      productDescription,
    } = await req.json();

    // Validate required fields
    if (!listingId || !sellerId || !chatId || !priceCents || !productName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 },
      );
    }

    // Get the current user
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User error:", userError);
      console.error("User:", user);
      return new Response(
        JSON.stringify({
          error: "Please sign in to purchase components",
          requiresAuth: true,
        }),
        {
          status: 401,
        },
      );
    }

    // Verify the listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from("marketplace_listings")
      .select("id, seller_id, is_active, price_cents")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
      });
    }

    if (!listing.is_active) {
      return new Response(JSON.stringify({ error: "Listing is not active" }), {
        status: 400,
      });
    }

    // Verify price matches
    if (listing.price_cents !== priceCents) {
      return new Response(JSON.stringify({ error: "Price mismatch" }), {
        status: 400,
      });
    }

    // Check if user already purchased this component (stronger validation)
    const { data: existingPurchase, error: purchaseCheckError } = await supabase
      .from("marketplace_purchases")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("listing_id", listingId)
      .maybeSingle();

    // If there's an error checking, it might be a race condition, so be safe and deny
    if (purchaseCheckError) {
      console.error("Error checking existing purchase:", purchaseCheckError);
      return new Response(
        JSON.stringify({ error: "Unable to verify purchase status" }),
        { status: 500 },
      );
    }

    if (existingPurchase) {
      return new Response(
        JSON.stringify({ error: "You have already purchased this component" }),
        { status: 400 },
      );
    }

    // Prevent users from buying their own components
    if (user.id === sellerId) {
      return new Response(
        JSON.stringify({ error: "Cannot purchase own component" }),
        { status: 400 },
      );
    }

    // Get or create Stripe customer
    const customer = await createOrRetrieveCustomer({
      uuid: user.id,
      email: user.email || "",
    });

    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Failed to create customer" }),
        { status: 500 },
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description:
                productDescription ||
                `Premium component from CodeRocket Marketplace`,
              metadata: {
                type: "marketplace_component",
                framework: "web_component",
              },
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.coderocket.app"}/account/marketplace/purchases?purchase=success&listing=${listingId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.coderocket.app"}/marketplace/${listingId}`,
      metadata: {
        type: "marketplace_purchase",
        buyer_id: user.id,
        listing_id: listingId,
        seller_id: sellerId,
        chat_id: chatId,
        version: version.toString(),
        price_cents: priceCents.toString(),
        platform_commission_cents: platformCommissionCents.toString(),
        seller_earning_cents: sellerEarningCents.toString(),
      },
      billing_address_collection: "auto",
      tax_id_collection: { enabled: true },
      customer_update: { name: "auto", address: "auto" },
    });

    if (!session.url) {
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session" }),
        { status: 500 },
      );
    }

    return new Response(JSON.stringify({ sessionUrl: session.url }), {
      status: 200,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 },
    );
  }
}
