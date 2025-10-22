"use client";

import { useState } from "react";

import {
  deactivateMarketplaceListing,
  reactivateMarketplaceListing,
  getUserMarketplaceListings,
} from "@/app/(default)/templates/actions";
import { useToast } from "@/hooks/use-toast";

import { ListingCard } from "./listing-card";

type ListingData = Awaited<ReturnType<typeof getUserMarketplaceListings>>[0];

interface MyListingsClientProps {
  initialListings: ListingData[];
}

export function MyListingsClient({ initialListings }: MyListingsClientProps) {
  const [listings, setListings] = useState<ListingData[]>(initialListings);
  const { toast } = useToast();

  const handleDeactivateListing = async (listingId: string) => {
    const result = await deactivateMarketplaceListing(listingId);

    if (result.success) {
      setListings((prev) =>
        prev.map((listing) =>
          listing.id === listingId ? { ...listing, is_active: false } : listing,
        ),
      );
      toast({
        title: "Success",
        description: "Listing has been deactivated",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error || "Failed to deactivate listing",
      });
    }
  };

  const handleReactivateListing = async (listingId: string) => {
    const result = await reactivateMarketplaceListing(listingId);

    if (result.success) {
      setListings((prev) =>
        prev.map((listing) =>
          listing.id === listingId ? { ...listing, is_active: true } : listing,
        ),
      );
      toast({
        title: "Success",
        description: "Listing has been reactivated",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error || "Failed to reactivate listing",
      });
    }
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          onDeactivate={handleDeactivateListing}
          onReactivate={handleReactivateListing}
        />
      ))}
    </div>
  );
}
