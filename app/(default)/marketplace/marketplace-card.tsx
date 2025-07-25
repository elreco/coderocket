"use client";

import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import { Eye, ShoppingCart, Tag, User, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { createClient } from "@/utils/supabase/client";

import { type MarketplaceListing } from "./actions";

interface MarketplaceCardProps {
  listing: MarketplaceListing;
  isReverse?: boolean;
}

export function MarketplaceCard({ listing, isReverse }: MarketplaceCardProps) {
  const [isOwnListing, setIsOwnListing] = useState(false);
  const priceFormatted = `$${(listing.price_cents / 100).toFixed(2)}`;

  useEffect(() => {
    const checkOwnership = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      setIsOwnListing(userData.user?.id === listing.seller_id);
    };

    checkOwnership();
  }, [listing.seller_id]);

  const FrameworkIcon =
    listing.chat.framework === Framework.REACT
      ? SiReact
      : listing.chat.framework === Framework.VUE
        ? SiVuedotjs
        : SiHtml5;

  return (
    <div
      key={listing.id}
      className={cn(
        "w-full bg-center overflow-hidden relative card rounded-md mx-auto",
        isReverse ? "bg-background" : "bg-secondary",
      )}
    >
      {/* Image */}
      <Link href={`/marketplace/${listing.id}`}>
        <div
          className="group relative aspect-video w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${
              listing.screenshot || "https://www.coderocket.app/placeholder.svg"
            })`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100">
            <Eye className="size-8 translate-y-4 text-white transition-transform duration-300 ease-in-out group-hover:translate-y-0" />
          </div>

          {/* Badges in top corners */}
          <div className="absolute right-3 top-3">
            <Badge className="bg-green-600 text-white shadow-sm">
              {priceFormatted}
            </Badge>
          </div>

          <div className="absolute left-3 top-3 flex flex-col gap-2">
            {isOwnListing && (
              <Badge className="bg-blue-600 text-white shadow-sm">
                <User className="mr-1 size-3" />
                Your Listing
              </Badge>
            )}
            {listing.demo_url && (
              <a
                href={listing.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                title="View Live Demo"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center rounded-md bg-purple-600 px-2 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-purple-700"
              >
                <ExternalLink className="mr-1 size-3" />
                Demo
              </a>
            )}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="flex h-36 flex-col justify-between p-4">
        {/* Title and Seller */}
        <div className="flex flex-col gap-0.5">
          <Link href={`/marketplace/${listing.id}`}>
            <h1 className="line-clamp-2 max-w-full whitespace-pre-wrap text-sm font-medium text-foreground hover:text-foreground/80">
              {listing.title}
            </h1>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href={`/users/${listing.seller.id}`}>
              <span className="hover:text-muted-foreground/80">
                {listing.seller.full_name || "Anonymous seller"}
              </span>
            </Link>
            <span className="text-muted-foreground/60">•</span>
            <span>{getRelativeDate(listing.created_at)}</span>
          </div>
        </div>

        {/* Category Badge and Stats */}
        <div className="mt-5 flex items-center justify-between">
          <Badge className="hover:bg-primary">
            <FrameworkIcon className="mr-1 size-3" />
            <span className="first-letter:uppercase">
              {listing.chat.framework}
            </span>
          </Badge>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {(listing.total_sales || 0) > 0 && (
              <div className="flex items-center gap-1">
                <ShoppingCart className="size-3" />
                <span>{listing.total_sales}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Tag className="size-3" />
              <span>{listing.category.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
