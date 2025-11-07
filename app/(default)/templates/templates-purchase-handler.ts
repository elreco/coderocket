"use server";

import { nanoid } from "nanoid";
import { after } from "next/server";

import { buildComponent } from "@/app/(default)/components/[slug]/actions";
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
      console.error("Missing required purchase metadata:", {
        buyer_id,
        listing_id,
        seller_id,
        chat_id,
        version,
        price_cents,
      });
      throw new Error("Missing required purchase metadata");
    }

    // Validate buyer_id is a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(buyer_id)) {
      console.error("Invalid buyer_id format:", buyer_id);
      throw new Error("Invalid buyer ID format");
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

    // Check if buyer has premium subscription to determine privacy setting
    const { data: buyerSubscription } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", buyer_id)
      .eq("status", "active")
      .single();

    const isPrivate = !!buyerSubscription; // Only premium users can have private components

    const { data: purchasedChat, error: purchasedChatError } = await supabase
      .from("chats")
      .insert({
        user_id: buyer_id,
        title: `${originalChat.title} (Purchased)`,
        slug: purchasedChatSlug,
        framework: originalChat.framework,
        is_private: isPrivate, // Private only for premium users
        artifact_code:
          originalChat.artifact_code ||
          originalMessage.artifact_code ||
          defaultArtifactCode[
            originalChat.framework as keyof typeof defaultArtifactCode
          ] ||
          defaultArtifactCode.html,
        // No remix fields - purchased components are standalone
      })
      .select("id")
      .single();

    if (purchasedChatError || !purchasedChat) {
      console.error("Failed to create purchased component chat:", {
        error: purchasedChatError,
        buyer_id,
        originalChatTitle: originalChat.title,
        slug: purchasedChatSlug,
        framework: originalChat.framework,
      });
      throw new Error(
        `Failed to create purchased component chat: ${purchasedChatError?.message || "Unknown error"}`,
      );
    }

    // For templates, we only need the final version (the one being sold)
    // This prevents creating unnecessary versions that consume user credits
    const targetVersion = parseInt(version);

    console.log("Copying template messages:", {
      purchasedVersion: targetVersion,
      chatId: chat_id,
    });

    // Get only the messages for the specific version being purchased
    const { data: originalMessages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chat_id)
      .eq("version", targetVersion)
      .order("created_at", { ascending: true });

    if (messagesError || !originalMessages || originalMessages.length === 0) {
      throw new Error("Failed to fetch original messages for context");
    }

    // For templates, we create a simple structure with just the user prompt and assistant response
    // This prevents creating multiple versions that consume credits
    const userMessage = originalMessages.find((m) => m.role === "user");
    const assistantMessage = originalMessages.find(
      (m) => m.role === "assistant",
    );

    if (!userMessage || !assistantMessage) {
      throw new Error("Template messages not found");
    }

    // Create only 2 messages: user prompt (version 0) and assistant response (version 0)
    const messagesToInsert = [
      {
        chat_id: purchasedChat.id,
        role: "user" as const,
        content: userMessage.content,
        theme: userMessage.theme,
        version: 0,
        subscription_type: userMessage.subscription_type,
        prompt_image: userMessage.prompt_image,
        artifact_code: null,
        input_tokens: userMessage.input_tokens,
        output_tokens: userMessage.output_tokens,
        screenshot: null,
        is_built: false,
      },
      {
        chat_id: purchasedChat.id,
        role: "assistant" as const,
        content: assistantMessage.content,
        theme: assistantMessage.theme,
        version: 0,
        subscription_type: assistantMessage.subscription_type,
        prompt_image: assistantMessage.prompt_image,
        artifact_code: assistantMessage.artifact_code,
        input_tokens: assistantMessage.input_tokens,
        output_tokens: assistantMessage.output_tokens,
        screenshot: assistantMessage.screenshot,
        is_built: false,
      },
    ];

    console.log("Template messages to insert:", {
      totalMessages: messagesToInsert.length,
      roles: messagesToInsert.map((m) => `${m.role}(v${m.version})`).join(", "),
    });

    const { error: messageInsertError } = await supabase
      .from("messages")
      .insert(messagesToInsert);

    if (messageInsertError) {
      console.error(
        "Failed to create purchased component messages:",
        messageInsertError,
      );
      throw new Error(
        `Failed to create purchased component messages: ${messageInsertError.message}`,
      );
    }

    // Don't track template usage - it's just a copy, not a real AI request

    console.log("Successfully created purchased component:", {
      purchasedChatId: purchasedChat.id,
      buyerId: buyer_id,
      originalChatId: chat_id,
      slug: purchasedChatSlug,
      title: `${originalChat.title} (Purchased)`,
    });

    // Verify the chat was created with correct ownership
    const { data: verifyChat } = await supabase
      .from("chats")
      .select("id, user_id, slug, title, is_private")
      .eq("id", purchasedChat.id)
      .single();

    console.log("Purchased chat verification:", {
      chatData: verifyChat,
      expectedUserId: buyer_id,
      userIdMatch: verifyChat?.user_id === buyer_id,
    });

    // Record the purchase in the database
    const { error: purchaseError, data: purchaseData } = await supabase
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
      })
      .select("id")
      .single();

    if (purchaseError || !purchaseData) {
      throw new Error("Failed to record purchase");
    }

    // Create earning record for the seller only if there are actual earnings (price > 0)
    if (parseInt(price_cents) > 0) {
      const { error: earningsError } = await supabase
        .from("marketplace_earnings")
        .insert({
          purchase_id: purchaseData?.id,
          seller_id,
          amount_cents: parseInt(seller_earning_cents),
          currency: "USD",
          status: "pending",
        });

      if (earningsError) {
        console.error("Failed to create earnings record:", earningsError);
        // Don't fail the entire purchase for earnings record failure
      }
    }

    // Update listing uses count
    const { error: salesUpdateError } = await supabase.rpc(
      "increment_listing_sales",
      { listing_id_param: listing_id },
    );

    if (salesUpdateError) {
      console.error("Failed to update total_sales:", salesUpdateError);
    } else {
      console.log("Successfully updated total_sales");
    }

    if (purchasedChat.id) {
      after(async () => {
        try {
          await buildComponent(purchasedChat.id, 0, true);
          console.log("Successfully built purchased template:", {
            chatId: purchasedChat.id,
            version: 0,
          });
        } catch (buildError) {
          console.error("Failed to build purchased template:", buildError);
        }
      });
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
