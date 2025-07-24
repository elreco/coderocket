"use server";

import { nanoid } from "nanoid";

import { defaultArtifactCode } from "@/utils/default-artifact-code";
import { createClient } from "@/utils/supabase/server";

export async function handleMarketplacePurchase(
  metadata: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      buyer_id,
      listing_id,
      seller_id,
      chat_id,
      version,
      price_cents,
      platform_commission_cents,
      seller_earning_cents,
    } = metadata;

    // Validate required metadata
    if (
      !buyer_id ||
      !listing_id ||
      !seller_id ||
      !chat_id ||
      !version ||
      !price_cents
    ) {
      throw new Error("Missing required purchase metadata");
    }

    const supabase = await createClient();

    // Get the original component and message
    const { data: originalChat, error: chatError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chat_id)
      .single();

    if (chatError || !originalChat) {
      throw new Error("Original component not found");
    }

    const { data: originalMessage, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chat_id)
      .eq("version", parseInt(version))
      .eq("role", "assistant")
      .single();

    if (messageError || !originalMessage) {
      throw new Error("Original component version not found");
    }

    // Create a new chat for the buyer (copy of the original)
    const purchasedChatSlug = await generateUniqueNanoid();

    const { data: purchasedChat, error: purchasedChatError } = await supabase
      .from("chats")
      .insert({
        user_id: buyer_id,
        title: `${originalChat.title} (Purchased)`,
        slug: purchasedChatSlug,
        framework: originalChat.framework,
        is_private: true, // Purchased components are private to the buyer
        artifact_code:
          originalMessage.artifact_code ||
          defaultArtifactCode[
            originalChat.framework as keyof typeof defaultArtifactCode
          ] ||
          defaultArtifactCode.html,
        remix_chat_id: chat_id, // Link to original component
        remix_from_version: parseInt(version),
      })
      .select("id")
      .single();

    if (purchasedChatError || !purchasedChat) {
      throw new Error("Failed to create purchased component chat");
    }

    // Copy the original message to the new chat as version 0
    const { error: messageInsertError } = await supabase
      .from("messages")
      .insert({
        chat_id: purchasedChat.id,
        role: "assistant",
        content: originalMessage.content,
        artifact_code: originalMessage.artifact_code,
        theme: originalMessage.theme,
        version: 0,
        subscription_type: originalMessage.subscription_type,
        input_tokens: originalMessage.input_tokens,
        output_tokens: originalMessage.output_tokens,
        screenshot: originalMessage.screenshot,
        is_built: originalMessage.is_built,
      });

    if (messageInsertError) {
      throw new Error("Failed to create purchased component message");
    }

    // Record the purchase in the database
    const { error: purchaseError } = await supabase
      .from("marketplace_purchases")
      .insert({
        buyer_id,
        listing_id,
        seller_id,
        chat_id,
        purchased_chat_id: purchasedChat.id,
        price_paid_cents: parseInt(price_cents),
        currency: "USD",
        platform_commission_cents: parseInt(platform_commission_cents),
        seller_earning_cents: parseInt(seller_earning_cents),
      });

    if (purchaseError) {
      throw new Error("Failed to record purchase");
    }

    // Create earning record for the seller
    const { error: earningsError } = await supabase
      .from("marketplace_earnings")
      .insert({
        seller_id,
        amount_cents: parseInt(seller_earning_cents),
        currency: "USD",
        status: "pending",
      });

    if (earningsError) {
      console.error("Failed to create earnings record:", earningsError);
      // Don't fail the entire purchase for earnings record failure
    }

    // Update listing sales count
    const { error: salesUpdateError } = await supabase.rpc(
      "increment_listing_sales",
      { listing_id_param: listing_id },
    );

    if (salesUpdateError) {
      console.error("Failed to update sales count:", salesUpdateError);
      // Don't fail the entire purchase for sales count update failure
    }

    return { success: true };
  } catch (error) {
    console.error("Marketplace purchase handling error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function generateUniqueNanoid(): Promise<string> {
  const supabase = await createClient();
  let uniqueSlug: string;
  let isUnique = false;

  while (!isUnique) {
    uniqueSlug = nanoid(10);
    const { data } = await supabase
      .from("chats")
      .select("slug")
      .eq("slug", uniqueSlug)
      .single();

    if (!data) {
      isUnique = true;
      return uniqueSlug;
    }
  }

  return nanoid(10); // Fallback
}
