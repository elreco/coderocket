import { DollarSign, Edit, EyeOff, Play } from "lucide-react";
import Link from "next/link";

import { getUserMarketplaceListings } from "@/app/(default)/marketplace/actions";
import { Button } from "@/components/ui/button";
import { UnifiedCard, UnifiedCardData } from "@/components/unified-card";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";

type ListingData = Awaited<ReturnType<typeof getUserMarketplaceListings>>[0];

export function ListingCard({
  listing,
  onDeactivate,
  onReactivate,
}: {
  listing: ListingData;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
  const estimatedEarnings =
    (listing.price_cents * (listing.total_sales || 0) * 0.7) / 100;

  const actionsContent = (
    <>
      <Button size="sm" variant="outline" asChild title="Edit listing">
        <Link href={`/marketplace/${listing.id}/manage`}>
          <Edit className="size-3" />
        </Link>
      </Button>
      {listing.is_active ? (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onDeactivate(listing.id);
          }}
          className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          title="Hide from marketplace"
        >
          <EyeOff className="size-3" />
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onReactivate(listing.id);
          }}
          className="text-green-600 hover:bg-green-50 hover:text-green-700"
          title="Show in marketplace"
        >
          <Play className="size-3" />
        </Button>
      )}
    </>
  );

  const cardData: UnifiedCardData = {
    id: listing.id,
    title: listing.title,
    imageUrl: listing.screenshot || undefined,
    framework: (listing.chat.framework || Framework.HTML) as Framework,
    createdAt: listing.created_at,
    href: `/marketplace/${listing.id}`,
    price: listing.price_cents,
    currency: listing.currency,
    category: {
      name: listing.category.name,
    },
    totalSales: listing.total_sales || 0,
    badges: [
      {
        text: listing.is_active ? "Active" : "Inactive",
        variant: listing.is_active ? "default" : "secondary",
      },
    ],
    actions: actionsContent,
    stats:
      (listing.total_sales || 0) > 0
        ? [
            {
              icon: <DollarSign className="size-3 text-green-600" />,
              value: `$${estimatedEarnings.toFixed(2)} earned`,
              className: "text-green-600",
            },
          ]
        : undefined,
  };

  return (
    <div className={cn(!listing.is_active && "opacity-60")}>
      <UnifiedCard data={cardData} showActions />
    </div>
  );
}
