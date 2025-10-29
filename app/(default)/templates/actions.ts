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
  demo_url?: string | null;
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
  purchased_chat?: {
    id: string;
    slug: string | null;
    title: string | null;
    framework: string | null;
  } | null;
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
  search?: string;
  framework?: string;
  sortBy?: "newest" | "oldest" | "price_low" | "price_high" | "popular";
  priceFilter?: "all" | "free" | "premium";
}): Promise<{ listings: MarketplaceListing[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    limit = 12,
    offset = 0,
    categoryId,
    search,
    framework,
    sortBy = "newest",
    priceFilter = "all",
  } = params;

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

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Price filtering
  if (priceFilter === "free") {
    query = query.eq("price_cents", 0);
  } else if (priceFilter === "premium") {
    query = query.gt("price_cents", 0);
  }

  // Framework filtering will be done after data retrieval since it's a joined field

  // Apply sorting
  switch (sortBy) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "price_low":
      query = query.order("price_cents", { ascending: true });
      break;
    case "price_high":
      query = query.order("price_cents", { ascending: false });
      break;
    case "popular":
      query = query.order("total_sales", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Add one extra to check if there are more results
  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching marketplace listings:", error);
    return { listings: [], hasMore: false };
  }

  if (!data || data.length === 0) {
    return { listings: [], hasMore: false };
  }

  // Check if there are more results by querying one extra
  const { data: nextData } = await query.range(offset + limit, offset + limit);
  const hasMore = Boolean(nextData && nextData.length > 0);

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
  let listingsWithScreenshots = data.map((listing) => {
    const screenshot = screenshots?.find(
      (s) => s.chat_id === listing.chat_id && s.version === listing.version,
    );
    return {
      ...listing,
      screenshot: screenshot?.screenshot || null,
    };
  });

  // Filter by framework if specified
  if (framework) {
    listingsWithScreenshots = listingsWithScreenshots.filter(
      (listing) => listing.chat.framework === framework,
    );
  }

  return {
    listings: listingsWithScreenshots,
    hasMore,
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

  // Check if user is premium (only required for paid templates)
  const subscription = await getSubscription();
  if (params.priceCents > 0 && !subscription) {
    return {
      success: false,
      error:
        "Premium subscription required to list paid templates. Free templates can be posted without subscription.",
    };
  }

  // Check if this component already has an active listing
  const { data: existingListing } = await supabase
    .from("marketplace_listings")
    .select("id")
    .eq("chat_id", params.chatId)
    .eq("seller_id", userData.user.id)
    .eq("is_active", true)
    .single();

  if (existingListing) {
    return {
      success: false,
      error: "This component is already listed as a template",
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
      error: "Only private components can be listed as templates",
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

  const { data: chatIntegrations } = await supabase
    .from("chat_integrations")
    .select("id")
    .eq("chat_id", params.chatId)
    .limit(1);

  if (chatIntegrations && chatIntegrations.length > 0) {
    return {
      success: false,
      error:
        "Components with backend integrations cannot be listed as templates. Integrations use personal credentials that cannot be shared. Please create a version without integrations to list it.",
    };
  }

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

export async function getUserMarketplacePurchases(): Promise<
  MarketplacePurchase[]
> {
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
      ),
      purchased_chat:chats!purchased_chat_id(id, slug, title, framework)
    `,
    )
    .eq("buyer_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user marketplace purchases:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get screenshots for all listings in one query
  const listingIds = data.map((purchase) => purchase.listing.chat_id);
  const versions = data.map((purchase) => purchase.listing.version);

  const { data: screenshots } = await supabase
    .from("messages")
    .select("chat_id, version, screenshot")
    .in("chat_id", listingIds)
    .in("version", versions)
    .eq("role", "assistant");

  // Map screenshots to purchases
  const purchasesWithScreenshots = data.map((purchase) => {
    const screenshot = screenshots?.find(
      (s) =>
        s.chat_id === purchase.listing.chat_id &&
        s.version === purchase.listing.version,
    );
    return {
      ...purchase,
      listing: {
        ...purchase.listing,
        screenshot: screenshot?.screenshot || null,
      },
    };
  });

  return purchasesWithScreenshots;
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

  // First get all private chats for the user
  const { data: chats, error: chatsError } = await supabase
    .from("chats")
    .select(
      `
      id,
      title,
      slug,
      framework,
      created_at,
      messages!inner(version, created_at)
    `,
    )
    .eq("user_id", userData.user.id)
    .eq("is_private", true)
    .eq("messages.role", "assistant")
    .order("created_at", { ascending: false });

  if (chatsError) {
    console.error("Error fetching private chats:", chatsError);
    return [];
  }

  if (!chats) return [];

  // Get all active marketplace listings to exclude components already listed
  const { data: activeListings } = await supabase
    .from("marketplace_listings")
    .select("chat_id")
    .eq("seller_id", userData.user.id)
    .eq("is_active", true);

  const listedChatIds = new Set(
    activeListings?.map((listing) => listing.chat_id) || [],
  );

  // Filter out chats that already have active listings and format the response
  const availableChats = chats
    .filter((chat) => !listedChatIds.has(chat.id))
    .map((chat) => ({
      id: chat.id,
      title: chat.title,
      slug: chat.slug,
      framework: chat.framework,
      created_at: chat.created_at || "",
      versions: chat.messages
        .map((msg) => ({
          version: msg.version,
          created_at: msg.created_at,
        }))
        .sort((a, b) => b.version - a.version),
    }));

  return availableChats;
}

export async function getUserPrivateComponentsPaginated(params: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{
  components: Array<{
    id: string;
    title: string | null;
    slug: string | null;
    framework: string | null;
    created_at: string;
    latest_version: number;
    total_versions: number;
    screenshot?: string | null;
  }>;
  hasMore: boolean;
}> {
  const supabase = await createClient();
  const { limit = 20, offset = 0, search = "" } = params;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { components: [], hasMore: false };

  // Build the query for private chats
  let query = supabase
    .from("chats")
    .select(
      `
      id,
      title,
      slug,
      framework,
      created_at
    `,
    )
    .eq("user_id", userData.user.id)
    .eq("is_private", true);

  // Add search filter if provided
  if (search.trim()) {
    query = query.or(`title.ilike.%${search}%,framework.ilike.%${search}%`);
  }

  // Add pagination and ordering
  const { data: chats, error: chatsError } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (chatsError) {
    console.error("Error fetching private chats:", chatsError);
    return { components: [], hasMore: false };
  }

  if (!chats || chats.length === 0) {
    return { components: [], hasMore: false };
  }

  // Check if there are more results
  const { data: nextChats } = await supabase
    .from("chats")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("is_private", true)
    .order("created_at", { ascending: false })
    .range(offset + limit, offset + limit);

  const hasMore = Boolean(nextChats && nextChats.length > 0);

  // Get all active marketplace listings to exclude components already listed
  const { data: activeListings } = await supabase
    .from("marketplace_listings")
    .select("chat_id")
    .eq("seller_id", userData.user.id)
    .eq("is_active", true);

  const listedChatIds = new Set(
    activeListings?.map((listing) => listing.chat_id) || [],
  );

  // Filter out chats that already have active listings
  const availableChats = chats.filter((chat) => !listedChatIds.has(chat.id));

  if (availableChats.length === 0) {
    return { components: [], hasMore: false };
  }

  // Get version information for these chats in a separate optimized query
  const { data: versionData } = await supabase
    .from("messages")
    .select("chat_id, version")
    .in(
      "chat_id",
      availableChats.map((chat) => chat.id),
    )
    .eq("role", "assistant");

  // Calculate version stats for each chat
  const versionStats =
    versionData?.reduce(
      (acc, msg) => {
        if (!acc[msg.chat_id]) {
          acc[msg.chat_id] = { versions: [], max: 0, count: 0 };
        }
        acc[msg.chat_id].versions.push(msg.version);
        acc[msg.chat_id].max = Math.max(acc[msg.chat_id].max, msg.version);
        acc[msg.chat_id].count++;
        return acc;
      },
      {} as Record<string, { versions: number[]; max: number; count: number }>,
    ) || {};

  // Get screenshots for the latest version of each component
  const { data: screenshots } = await supabase
    .from("messages")
    .select("chat_id, screenshot")
    .in(
      "chat_id",
      availableChats.map((chat) => chat.id),
    )
    .in(
      "version",
      availableChats.map((chat) => versionStats[chat.id]?.max || 0),
    )
    .eq("role", "assistant");

  const screenshotMap =
    screenshots?.reduce(
      (acc, msg) => {
        acc[msg.chat_id] = msg.screenshot;
        return acc;
      },
      {} as Record<string, string | null>,
    ) || {};

  // Format the response
  const components = availableChats.map((chat) => ({
    id: chat.id,
    title: chat.title,
    slug: chat.slug,
    framework: chat.framework,
    created_at: chat.created_at || "",
    latest_version: versionStats[chat.id]?.max || 0,
    total_versions: versionStats[chat.id]?.count || 0,
    screenshot: screenshotMap[chat.id] || null,
  }));

  return {
    components,
    hasMore,
  };
}

export async function getComponentVersions(chatId: string): Promise<
  Array<{
    version: number;
    created_at: string;
  }>
> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  // Verify the user owns this chat
  const { data: chatData } = await supabase
    .from("chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", userData.user.id)
    .eq("is_private", true)
    .single();

  if (!chatData) return [];

  // Get versions for this specific chat
  const { data: versions } = await supabase
    .from("messages")
    .select("version, created_at")
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .order("version", { ascending: false });

  return versions || [];
}

export async function deactivateMarketplaceListing(listingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      success: false,
      error: "You must be logged in to perform this action",
    };
  }

  try {
    // Verify the user owns this listing
    const { data: listing, error: fetchError } = await supabase
      .from("marketplace_listings")
      .select("id, seller_id, is_active")
      .eq("id", listingId)
      .single();

    if (fetchError || !listing) {
      return {
        success: false,
        error: "Listing not found",
      };
    }

    if (listing.seller_id !== userData.user.id) {
      return {
        success: false,
        error: "You can only deactivate your own listings",
      };
    }

    if (!listing.is_active) {
      return {
        success: false,
        error: "Listing is already inactive",
      };
    }

    // Deactivate the listing
    const { error: updateError } = await supabase
      .from("marketplace_listings")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    if (updateError) {
      console.error("Error deactivating listing:", updateError);
      return {
        success: false,
        error: "Failed to deactivate listing",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deactivateMarketplaceListing:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function reactivateMarketplaceListing(listingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      success: false,
      error: "You must be logged in to perform this action",
    };
  }

  try {
    // Verify the user owns this listing
    const { data: listing, error: fetchError } = await supabase
      .from("marketplace_listings")
      .select("id, seller_id, is_active")
      .eq("id", listingId)
      .single();

    if (fetchError || !listing) {
      return {
        success: false,
        error: "Listing not found",
      };
    }

    if (listing.seller_id !== userData.user.id) {
      return {
        success: false,
        error: "You can only reactivate your own listings",
      };
    }

    if (listing.is_active) {
      return {
        success: false,
        error: "Listing is already active",
      };
    }

    // Verify user still has premium subscription (skip for now)
    // TODO: Add proper subscription check when schema is updated

    // Reactivate the listing
    const { error: updateError } = await supabase
      .from("marketplace_listings")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    if (updateError) {
      console.error("Error reactivating listing:", updateError);
      return {
        success: false,
        error: "Failed to reactivate listing",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in reactivateMarketplaceListing:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function updateMarketplaceListing(params: {
  listingId: string;
  title: string;
  description: string;
  priceCents: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      success: false,
      error: "You must be logged in to perform this action",
    };
  }

  try {
    // Verify the user owns this listing
    const { data: listing, error: fetchError } = await supabase
      .from("marketplace_listings")
      .select("id, seller_id")
      .eq("id", params.listingId)
      .single();

    if (fetchError || !listing) {
      return {
        success: false,
        error: "Listing not found",
      };
    }

    if (listing.seller_id !== userData.user.id) {
      return {
        success: false,
        error: "You can only edit your own listings",
      };
    }

    // Validate inputs
    if (!params.title.trim() || !params.description.trim()) {
      return {
        success: false,
        error: "Title and description are required",
      };
    }

    if (params.priceCents <= 0) {
      return {
        success: false,
        error: "Price must be greater than $0",
      };
    }

    // Update the listing
    const { error: updateError } = await supabase
      .from("marketplace_listings")
      .update({
        title: params.title.trim(),
        description: params.description.trim(),
        price_cents: params.priceCents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.listingId);

    if (updateError) {
      console.error("Error updating listing:", updateError);
      return {
        success: false,
        error: "Failed to update listing",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateMarketplaceListing:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
