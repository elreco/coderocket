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

    // Get the last 5 versions to provide context while keeping it manageable
    const CONTEXT_VERSIONS = 5;
    const startVersion = Math.max(-1, parseInt(version) - CONTEXT_VERSIONS + 1);

    console.log("Copying message history:", {
      purchasedVersion: parseInt(version),
      startVersion,
      endVersion: parseInt(version),
      contextVersions: CONTEXT_VERSIONS,
    });

    // Get all messages from the last few versions to preserve context
    const { data: originalMessages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chat_id)
      .gte("version", startVersion)
      .lte("version", parseInt(version))
      .order("version", { ascending: true })
      .order("created_at", { ascending: true });

    if (messagesError || !originalMessages || originalMessages.length === 0) {
      throw new Error("Failed to fetch original messages for context");
    }

    // Calculate version offset to start from version 0
    // We want the first message to be at version 0, so we offset by the minimum version found
    const minVersion = Math.min(...originalMessages.map((m) => m.version));
    const versionOffset = minVersion;

    // Map messages to new chat with adjusted version numbers starting from 0
    const messagesToInsert = originalMessages.map((msg) => ({
      chat_id: purchasedChat.id,
      role: msg.role,
      content: msg.content,
      theme: msg.theme,
      version: msg.version - versionOffset,
      subscription_type: msg.subscription_type,
      prompt_image: msg.prompt_image,
      artifact_code: msg.artifact_code,
      input_tokens: msg.input_tokens,
      output_tokens: msg.output_tokens,
      screenshot: msg.screenshot,
      is_built: false, // Mark as not built so it gets built properly
    }));

    console.log("Messages to insert:", {
      totalMessages: messagesToInsert.length,
      versionRange: `${messagesToInsert[0]?.version} to ${messagesToInsert[messagesToInsert.length - 1]?.version}`,
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

    // Create earning record for the seller
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

    // Update listing sales count
    const { error: salesUpdateError } = await supabase.rpc(
      "increment_listing_sales",
      { listing_id_param: listing_id },
    );

    if (salesUpdateError) {
      console.error("Failed to update sales count:", salesUpdateError);
      // Don't fail the entire purchase for sales count update failure
    }

    // Build the component in the background after successful purchase
    // Find the highest version (should be the assistant message with the code)
    const maxVersion = Math.max(...messagesToInsert.map((m) => m.version));
    const assistantMessage = messagesToInsert.find(
      (m) => m.role === "assistant" && m.version === maxVersion,
    );

    if (assistantMessage && purchasedChat.id) {
      after(async () => {
        try {
          await buildComponent(purchasedChat.id, maxVersion, true);
          console.log("Successfully built purchased component:", {
            chatId: purchasedChat.id,
            version: maxVersion,
          });
        } catch (buildError) {
          console.error("Failed to build purchased component:", buildError);
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
