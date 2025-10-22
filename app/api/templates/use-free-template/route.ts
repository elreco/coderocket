import { NextRequest, NextResponse } from "next/server";

import { handleMarketplacePurchase } from "@/app/(default)/templates/templates-purchase-handler";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { listingId, sellerId, chatId, version } = await req.json();

    if (!listingId || !sellerId || !chatId || version === undefined) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Authentication required", requiresAuth: true },
        { status: 401 },
      );
    }

    const buyerId = userData.user.id;

    const { data: listing, error: listingError } = await supabase
      .from("marketplace_listings")
      .select("*, seller:users!seller_id(id)")
      .eq("id", listingId)
      .eq("is_active", true)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    if (listing.price_cents !== 0) {
      return NextResponse.json(
        { error: "This is not a free template" },
        { status: 400 },
      );
    }

    const { data: existingPurchase } = await supabase
      .from("marketplace_purchases")
      .select(
        "purchased_chat_id, chats!marketplace_purchases_purchased_chat_id_fkey(slug)",
      )
      .eq("buyer_id", buyerId)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (existingPurchase?.purchased_chat_id) {
      const slug =
        existingPurchase &&
        "chats" in existingPurchase &&
        existingPurchase.chats &&
        typeof existingPurchase.chats === "object" &&
        "slug" in existingPurchase.chats
          ? (existingPurchase.chats as { slug: string }).slug
          : undefined;
      return NextResponse.json({
        slug: slug || undefined,
        message: "You already have this template",
      });
    }

    const result = await handleMarketplacePurchase({
      buyer_id: buyerId,
      listing_id: listingId,
      seller_id: sellerId,
      chat_id: chatId,
      version: version.toString(),
      price_cents: "0",
      platform_commission_cents: "0",
      seller_earning_cents: "0",
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to process free template");
    }

    const { data: purchase } = await supabase
      .from("marketplace_purchases")
      .select(
        "purchased_chat_id, chats!marketplace_purchases_purchased_chat_id_fkey(slug)",
      )
      .eq("buyer_id", buyerId)
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const slug =
      purchase &&
      "chats" in purchase &&
      purchase.chats &&
      typeof purchase.chats === "object" &&
      "slug" in purchase.chats
        ? (purchase.chats as { slug: string }).slug
        : undefined;

    return NextResponse.json({
      success: true,
      slug: slug,
      message: "Template successfully added to your account",
    });
  } catch (error) {
    console.error("Error using free template:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
