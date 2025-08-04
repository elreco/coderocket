"use client";

import { useEffect, useState } from "react";

import { UnifiedCard, UnifiedCardData } from "@/components/unified-card";
import { Framework } from "@/utils/config";
import { createClient } from "@/utils/supabase/client";

import { type MarketplaceListing } from "./actions";

interface MarketplaceCardProps {
  listing: MarketplaceListing;
  isReverse?: boolean;
}

export function MarketplaceCard({ listing, isReverse }: MarketplaceCardProps) {
  const [isOwnListing, setIsOwnListing] = useState(false);

  useEffect(() => {
    const checkOwnership = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      setIsOwnListing(userData.user?.id === listing.seller_id);
    };

    checkOwnership();
  }, [listing.seller_id]);

  const cardData: UnifiedCardData = {
    id: listing.id,
    title: listing.title,
    imageUrl: listing.preview_image_url || listing.screenshot || undefined,
    framework: (listing.chat.framework || Framework.HTML) as Framework,
    createdAt: listing.created_at,
    author: {
      id: listing.seller.id,
      name: listing.seller.full_name || "Anonymous seller",
    },
    href: `/marketplace/${listing.id}`,
    price: listing.price_cents,
    currency: listing.currency,
    category: {
      name: listing.category.name,
    },
    totalSales: listing.total_sales || 0,
    isOwnItem: isOwnListing,
  };

  return <UnifiedCard data={cardData} isReverse={isReverse} />;
}
