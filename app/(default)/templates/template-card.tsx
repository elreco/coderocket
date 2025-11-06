"use client";

import { useEffect, useState } from "react";

import { UnifiedCard, UnifiedCardData } from "@/components/unified-card";
import { Framework } from "@/utils/config";
import { createClient } from "@/utils/supabase/client";

import { type MarketplaceListing } from "./actions";

interface TemplateCardProps {
  template: MarketplaceListing;
  isReverse?: boolean;
}

export function TemplateCard({ template, isReverse }: TemplateCardProps) {
  const [isOwnTemplate, setIsOwnTemplate] = useState(false);

  useEffect(() => {
    const checkOwnership = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      setIsOwnTemplate(userData.user?.id === template.seller_id);
    };

    checkOwnership();
  }, [template.seller_id]);

  const cardData: UnifiedCardData = {
    id: template.id,
    title: template.title,
    imageUrl: template.preview_image_url || template.screenshot || undefined,
    framework: (template.chat.framework || Framework.HTML) as Framework,
    createdAt: template.created_at,
    author: {
      id: template.seller.id,
      name: template.seller.full_name || "Anonymous seller",
    },
    user_avatar_url: template.seller.avatar_url || undefined,
    href: `/templates/${template.id}`,
    price: template.price_cents,
    currency: template.currency,
    category: {
      name: template.category.name,
    },
    totalSales: template.total_sales || 0,
    isOwnItem: isOwnTemplate,
  };

  return <UnifiedCard data={cardData} isReverse={isReverse} />;
}
