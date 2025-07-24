import { Eye, Heart, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { type MarketplaceListing } from "./actions";

interface MarketplaceCardProps {
  listing: MarketplaceListing;
}

export function MarketplaceCard({ listing }: MarketplaceCardProps) {
  return (
    <Card className="group relative h-full overflow-hidden transition-all duration-200 hover:shadow-lg">
      <CardHeader className="p-0">
        {/* Preview Image */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {listing.preview_image_url ? (
            <Image
              src={listing.preview_image_url}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20">
              <div className="text-center">
                <Eye className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No preview</p>
              </div>
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute left-3 top-3">
            <Badge
              variant="secondary"
              className="bg-white/90 text-black shadow-sm backdrop-blur-sm"
            >
              {listing.category.name}
            </Badge>
          </div>

          {/* Price Badge */}
          <div className="absolute right-3 top-3">
            <Badge className="bg-green-600 text-white shadow-sm">
              ${(listing.price_cents / 100).toFixed(2)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex-1 space-y-3">
          {/* Title */}
          <Link href={`/marketplace/${listing.id}`} className="block">
            <h3 className="line-clamp-2 font-semibold leading-tight transition-colors hover:text-primary">
              {listing.title}
            </h3>
          </Link>

          {/* Description */}
          {listing.description && (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {listing.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="size-3" />
              <span>{listing.total_sales || 0} sales</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="size-3" />
              <span>{new Date(listing.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">by</span>
            <span className="text-sm font-medium">
              {listing.seller.full_name || "Unknown"}
            </span>
          </div>

          <Button asChild size="sm" className="flex items-center gap-1">
            <Link href={`/marketplace/${listing.id}`}>
              <ShoppingCart className="size-3" />
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
