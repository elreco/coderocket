"use server";

import { getSubscription } from "@/app/supabase-server";
import { createClient } from "@/utils/supabase/server";

export type MarketplaceCategory = {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  created_at: string;
};

export type MarketplaceListing = {
  id: string;
  seller_id: string;
  chat_id: string;
  version: number;
  category_id: number;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  preview_image_url: string | null;
  demo_url: string | null;
  is_active: boolean | null;
  total_sales: number | null; // Changed to match database schema
  created_at: string;
  updated_at: string;
  category: MarketplaceCategory;
  seller: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  chat: {
    id: string;
    title: string | null;
    framework: string | null;
    slug: string | null;
  };
  screenshot: string | null;
};

export type MarketplacePurchase = {
  id: string;
  buyer_id: string;
  listing_id: string;
  seller_id: string;
  chat_id: string;
  purchased_chat_id: string | null;
  price_paid_cents: number;
  currency: string;
  platform_commission_cents: number;
  seller_earning_cents: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
  listing: MarketplaceListing;
};

export async function getMarketplaceCategories(): Promise<
  MarketplaceCategory[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketplace_categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching marketplace categories:", error);
    return [];
  }

  return data || [];
}

export async function getMarketplaceListings(params: {
  limit?: number;
  offset?: number;
  categoryId?: number;
  searchQuery?: string;
  sortBy?: "recent" | "popular" | "price_low" | "price_high";
}): Promise<{ listings: MarketplaceListing[]; hasMore: boolean }> {
  const {
    limit = 20,
    offset = 0,
    categoryId,
    searchQuery,
    sortBy = "recent",
  } = params;

  const supabase = await createClient();

  let query = supabase
    .from("marketplace_listings")
    .select(
      `
      *,
      category:marketplace_categories(*),
      seller:users!seller_id(id, full_name, avatar_url),
      chat:chats!chat_id(id, title, framework, slug)
    `,
    )
    .eq("is_active", true);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (searchQuery && searchQuery.trim()) {
    query = query.or(
      `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`,
    );
  }

  // Apply sorting
  switch (sortBy) {
    case "popular":
      query = query.order("total_sales", { ascending: false });
      break;
    case "price_low":
      query = query.order("price_cents", { ascending: true });
      break;
    case "price_high":
      query = query.order("price_cents", { ascending: false });
      break;
    case "recent":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query.range(offset, offset + limit);

  if (error) {
    console.error("Error fetching marketplace listings:", error);
    return { listings: [], hasMore: false };
  }

  if (!data || data.length === 0) {
    return { listings: [], hasMore: false };
  }

  // Get screenshots for all listings in one query
  const listingIds = data.map((listing) => listing.chat_id);
  const versions = data.map((listing) => listing.version);

  const { data: screenshots } = await supabase
    .from("messages")
    .select("chat_id, version, screenshot")
    .in("chat_id", listingIds)
    .in("version", versions)
    .eq("role", "assistant");

  // Map screenshots to listings
  const listingsWithScreenshots = data.map((listing) => {
    const screenshot = screenshots?.find(
      (s) => s.chat_id === listing.chat_id && s.version === listing.version,
    );
    return {
      ...listing,
      screenshot: screenshot?.screenshot || null,
    };
  });

  return {
    listings: listingsWithScreenshots,
    hasMore: (data?.length || 0) === limit + 1,
  };
}

export async function createMarketplaceListing(params: {
  chatId: string;
  version: number;
  categoryId: number;
  title: string;
  description: string;
  priceCents: number;
}): Promise<{ success: boolean; error?: string; listingId?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { success: false, error: "Authentication required" };
  }

  // Check if user is premium
  const subscription = await getSubscription();
  if (!subscription) {
    return {
      success: false,
      error: "Premium subscription required to list components",
    };
  }

  // Verify the component exists and is private
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, is_private, user_id")
    .eq("id", params.chatId)
    .eq("user_id", userData.user.id)
    .single();

  if (chatError || !chat) {
    return { success: false, error: "Component not found or access denied" };
  }

  if (!chat.is_private) {
    return {
      success: false,
      error: "Only private components can be listed on the marketplace",
    };
  }

  // Verify the version exists
  const { data: message, error: messageError } = await supabase
    .from("messages")
    .select("id")
    .eq("chat_id", params.chatId)
    .eq("version", params.version)
    .eq("role", "assistant")
    .single();

  if (messageError || !message) {
    return { success: false, error: "Component version not found" };
  }

  // Create the listing
  const { data, error } = await supabase
    .from("marketplace_listings")
    .insert({
      seller_id: userData.user.id,
      chat_id: params.chatId,
      version: params.version,
      category_id: params.categoryId,
      title: params.title,
      description: params.description,
      price_cents: params.priceCents,
      currency: "USD",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating marketplace listing:", error);
    return { success: false, error: "Failed to create listing" };
  }

  return { success: true, listingId: data.id };
}

export async function getUserMarketplaceListings(
  userId?: string,
): Promise<MarketplaceListing[]> {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];
    targetUserId = userData.user.id;
  }

  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(
      `
      *,
      category:marketplace_categories(*),
      seller:users!seller_id(id, full_name, avatar_url),
      chat:chats!chat_id(id, title, framework, slug)
    `,
    )
    .eq("seller_id", targetUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user marketplace listings:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get screenshots for all listings in one query
  const listingIds = data.map((listing) => listing.chat_id);
  const versions = data.map((listing) => listing.version);

  const { data: screenshots } = await supabase
    .from("messages")
    .select("chat_id, version, screenshot")
    .in("chat_id", listingIds)
    .in("version", versions)
    .eq("role", "assistant");

  // Map screenshots to listings
  const listingsWithScreenshots = data.map((listing) => {
    const screenshot = screenshots?.find(
      (s) => s.chat_id === listing.chat_id && s.version === listing.version,
    );
    return {
      ...listing,
      screenshot: screenshot?.screenshot || null,
    };
  });

  return listingsWithScreenshots;
}

export async function getUserMarketplacePurchases() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("marketplace_purchases")
    .select(
      `
      *,
      listing:marketplace_listings(
        *,
        category:marketplace_categories(*),
        seller:users!seller_id(id, full_name, avatar_url),
        chat:chats!chat_id(id, title, framework, slug)
      )
    `,
    )
    .eq("buyer_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user marketplace purchases:", error);
    return [];
  }

  return data || [];
}

export async function getMarketplaceListing(
  listingId: string,
): Promise<MarketplaceListing | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(
      `
      *,
      category:marketplace_categories(*),
      seller:users!seller_id(id, full_name, avatar_url),
      chat:chats!chat_id(id, title, framework, slug)
    `,
    )
    .eq("id", listingId)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("Error fetching marketplace listing:", error);
    return null;
  }

  // Get the screenshot for this specific version
  const { data: message } = await supabase
    .from("messages")
    .select("screenshot")
    .eq("chat_id", data.chat_id)
    .eq("version", data.version)
    .eq("role", "assistant")
    .single();

  return {
    ...data,
    screenshot: message?.screenshot || null,
  };
}

export async function getUserPrivateComponents() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  // Get private components
  const { data: chats, error: chatsError } = await supabase
    .from("chats")
    .select("id, title, slug, framework, created_at")
    .eq("user_id", userData.user.id)
    .eq("is_private", true)
    .order("created_at", { ascending: false });

  if (chatsError || !chats) {
    console.error("Error fetching private components:", chatsError);
    return [];
  }

  // Get versions for each chat
  const componentsWithVersions = await Promise.all(
    chats.map(async (chat) => {
      const { data: messages } = await supabase
        .from("messages")
        .select("version, created_at")
        .eq("chat_id", chat.id)
        .eq("role", "assistant")
        .order("version", { ascending: false });

      return {
        ...chat,
        versions: messages || [],
      };
    }),
  );

  return componentsWithVersions;
}
