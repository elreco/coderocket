import {
  Edit,
  Eye,
  EyeOff,
  Play,
  TrendingUp,
  DollarSign,
  Settings,
} from "lucide-react";
import Link from "next/link";

import { getUserMarketplaceListings } from "@/app/(default)/marketplace/actions";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { SmartCreateListingButton } from "@/components/smart-create-listing-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedCard, UnifiedCardData } from "@/components/unified-card";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";

import { MyListingsClient } from "./my-listings-client";

type ListingData = Awaited<ReturnType<typeof getUserMarketplaceListings>>[0];

export default async function MyListingsPage() {
  const listings = await getUserMarketplaceListings();

  const activeListings = listings.filter((l) => l.is_active);
  const inactiveListings = listings.filter((l) => !l.is_active);
  const totalSales = listings.reduce(
    (sum, listing) => sum + (listing.total_sales || 0),
    0,
  );
  const totalEarnings = listings.reduce((sum, listing) => {
    const earnings =
      (listing.price_cents * (listing.total_sales || 0) * 0.7) / 100;
    return sum + earnings;
  }, 0);

  return (
    <Container className="pr-2 sm:pr-11">
      <PageTitle
        title="My Listings"
        subtitle="Manage your marketplace components and track sales"
      />
      <div className="mb-8 flex gap-4">
        <SmartCreateListingButton>Create New Listing</SmartCreateListingButton>
        <Button asChild variant="secondary">
          <Link href="/marketplace" className="flex items-center gap-2">
            <Eye className="size-4" />
            <span>Browse Marketplace</span>
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link
            href="/account/marketplace/earnings"
            className="flex items-center gap-2"
          >
            <DollarSign className="size-4" />
            <span>Earnings & Payouts</span>
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link
            href="/account/marketplace/stripe-onboarding"
            className="flex items-center gap-2"
          >
            <Settings className="size-4" />
            <span>Stripe Dashboard</span>
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Listings
                </CardTitle>
                <div className="text-2xl font-bold">{listings.length}</div>
              </div>
              <div className="rounded-full bg-muted p-2">
                <Eye className="size-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              {activeListings.length} active, {inactiveListings.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </CardTitle>
                <div className="text-2xl font-bold">{totalSales}</div>
              </div>
              <div className="rounded-full bg-muted p-2">
                <TrendingUp className="size-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Across all components
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estimated Earnings
                </CardTitle>
                <div className="text-2xl font-bold">
                  ${totalEarnings.toFixed(2)}
                </div>
              </div>
              <div className="rounded-full bg-muted p-2">
                <DollarSign className="size-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              70% after platform fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg. Sale Price
                </CardTitle>
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
              </div>
              <div className="rounded-full bg-muted p-2">
                <DollarSign className="size-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Average listing price
            </p>
          </CardContent>
        </Card>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-12 pb-10 text-center">
          <h3 className="mb-4 text-lg font-semibold">No Listings Yet</h3>
          <p className="mb-6 text-muted-foreground">
            You haven&apos;t created any marketplace listings yet. Start selling
            your components to earn money!
          </p>
          <SmartCreateListingButton
            customText={{
              create: "Create Your First Listing",
              becomeSeller: "Become a Seller",
            }}
          >
            Create Your First Listing
          </SmartCreateListingButton>
        </div>
      ) : (
        <div className="pb-10">
          <MyListingsClient initialListings={listings} />
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

export { ListingCard };
