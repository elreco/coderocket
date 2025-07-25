"use client";

import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import {
  Plus,
  Edit,
  Eye,
  EyeOff,
  Play,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

import {
  getUserMarketplaceListings,
  deactivateMarketplaceListing,
  reactivateMarketplaceListing,
} from "../../../marketplace/actions";

type ListingData = Awaited<ReturnType<typeof getUserMarketplaceListings>>[0];

export default function MyListingsPage() {
  const [listings, setListings] = useState<ListingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const listingsData = await getUserMarketplaceListings();
        setListings(listingsData);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your listings",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

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

  if (isLoading) {
    return (
      <Container className="pr-2 sm:pr-11">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">
              Loading your listings...
            </p>
          </div>
        </div>
      </Container>
    );
  }

  const activeListings = listings.filter((l) => l.is_active);
  const inactiveListings = listings.filter((l) => !l.is_active);
  const totalSales = listings.reduce(
    (sum, listing) => sum + (listing.total_sales || 0),
    0,
  );
  const totalEarnings = listings.reduce((sum, listing) => {
    // Calculate estimated earnings (70% of sales)
    const earnings =
      (listing.price_cents * (listing.total_sales || 0) * 0.7) / 100;
    return sum + earnings;
  }, 0);

  return (
    <Container className="pr-2 sm:pr-11">
      <div className="flex items-center justify-between">
        <PageTitle
          title="My Listings"
          subtitle="Manage your marketplace components and track sales"
        />
        <Button size="lg" asChild>
          <Link href="/marketplace/create">
            <Plus className="mr-2 size-4" />
            Create New Listing
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Listings
            </CardTitle>
            <Eye className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{listings.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeListings.length} active, {inactiveListings.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Across all components
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Estimated Earnings
            </CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              70% after platform fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Sale Price
            </CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {listings.length > 0
                ? (
                    listings.reduce((sum, l) => sum + l.price_cents, 0) /
                    listings.length /
                    100
                  ).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Average listing price
            </p>
          </CardContent>
        </Card>
      </div>

      {listings.length === 0 ? (
        <Card className="p-8 text-center">
          <CardTitle className="mb-4">No Listings Yet</CardTitle>
          <p className="mb-6 text-muted-foreground">
            You haven&apos;t created any marketplace listings yet. Start selling
            your components to earn money!
          </p>
          <Button asChild>
            <Link href="/marketplace/create">
              <Plus className="mr-2 size-4" />
              Create Your First Listing
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onDeactivate={handleDeactivateListing}
              onReactivate={handleReactivateListing}
            />
          ))}
        </div>
      )}
    </Container>
  );
}

function ListingCard({
  listing,
  onDeactivate,
  onReactivate,
}: {
  listing: ListingData;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
  const priceFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: listing.currency,
  }).format(listing.price_cents / 100);

  const estimatedEarnings =
    (listing.price_cents * (listing.total_sales || 0) * 0.7) / 100;

  const FrameworkIcon =
    listing.chat.framework === Framework.REACT
      ? SiReact
      : listing.chat.framework === Framework.VUE
        ? SiVuedotjs
        : SiHtml5;

  return (
    <div
      className={cn(
        "w-full bg-center overflow-hidden relative card rounded-md mx-auto transition-opacity",
        !listing.is_active ? "opacity-60" : "bg-secondary",
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

          {/* Price badge */}
          <div className="absolute right-3 top-3">
            <Badge className="bg-green-600 text-white shadow-sm">
              {priceFormatted}
            </Badge>
          </div>

          {/* Status badge */}
          <div className="absolute left-3 top-3">
            <Badge variant={listing.is_active ? "default" : "secondary"}>
              {listing.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="flex h-44 flex-col justify-between p-4">
        {/* Title and Category */}
        <div className="flex flex-col gap-0.5">
          <Link href={`/marketplace/${listing.id}`}>
            <h1 className="line-clamp-2 max-w-full whitespace-pre-wrap text-sm font-medium text-foreground hover:text-foreground/80">
              {listing.title}
            </h1>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{listing.category.name}</span>
            <span className="text-muted-foreground/60">•</span>
            <span>{getRelativeDate(listing.created_at)}</span>
          </div>
          {(listing.total_sales || 0) > 0 && (
            <div className="mt-1 text-xs text-green-600">
              ${estimatedEarnings.toFixed(2)} earned
            </div>
          )}
        </div>

        {/* Framework Badge and Actions */}
        <div className="mt-5 flex items-center justify-between">
          <Badge className="hover:bg-primary">
            <FrameworkIcon className="mr-1 size-3" />
            <span className="first-letter:uppercase">
              {listing.chat.framework}
            </span>
          </Badge>

          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/marketplace/${listing.id}`}>
                <Eye className="size-3" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/marketplace/${listing.id}/manage`}>
                <Edit className="size-3" />
              </Link>
            </Button>
            {listing.is_active ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeactivate(listing.id)}
                className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                title="Hide from marketplace"
              >
                <EyeOff className="size-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReactivate(listing.id)}
                className="text-green-600 hover:bg-green-50 hover:text-green-700"
                title="Show in marketplace"
              >
                <Play className="size-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
