import { Plus, Eye, Edit, TrendingUp, DollarSign } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRelativeDate } from "@/utils/date";

import {
  getUserMarketplaceListings,
  getMarketplaceCategories,
} from "../../../marketplace/actions";
import { ListingForm } from "../../../marketplace/listing-form";

export const metadata = {
  title: "My Listings - CodeRocket",
  description:
    "Manage your marketplace listings and track your component sales.",
};

export default async function MyListingsPage() {
  const [listings, categories] = await Promise.all([
    getUserMarketplaceListings(),
    getMarketplaceCategories(),
  ]);

  const activeListings = listings.filter((l) => l.is_active);
  const inactiveListings = listings.filter((l) => !l.is_active);
  const totalSales = listings.reduce(
    (sum, listing) => sum + (listing.total_sales ?? 0),
    0,
  );
  const totalEarnings = listings.reduce((sum, listing) => {
    // Calculate estimated earnings (70% of sales)
    const earnings =
      (listing.price_cents * (listing.total_sales ?? 0) * 0.7) / 100;
    return sum + earnings;
  }, 0);

  return (
    <Container className="pr-2 sm:pr-11">
      <div className="flex items-center justify-between">
        <PageTitle
          title="My Listings"
          subtitle="Manage your marketplace components and track sales"
        />
        <ListingForm
          categories={categories}
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Create Listing
            </Button>
          }
        />
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
          <CardContent className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
              <Plus className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No listings yet</h3>
              <p className="text-muted-foreground">
                Start selling your components on the marketplace to earn money
                from your creations.
              </p>
            </div>
            <ListingForm
              categories={categories}
              trigger={
                <Button>
                  <Plus className="mr-2 size-4" />
                  Create Your First Listing
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Listings */}
          {activeListings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Active Listings ({activeListings.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Listings */}
          {inactiveListings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Inactive Listings ({inactiveListings.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inactiveListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Container>
  );
}

function ListingCard({
  listing,
}: {
  listing: Awaited<ReturnType<typeof getUserMarketplaceListings>>[0];
}) {
  const priceFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: listing.currency,
  }).format(listing.price_cents / 100);

  const estimatedEarnings =
    (listing.price_cents * (listing.total_sales ?? 0) * 0.7) / 100;

  return (
    <Card
      className={`transition-opacity ${!listing.is_active ? "opacity-60" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge variant={listing.is_active ? "default" : "secondary"}>
            {listing.category.name}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {listing.chat.framework?.toUpperCase()}
          </Badge>
        </div>
        <CardTitle className="text-base leading-tight">
          {listing.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {listing.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Price:</span>
          <span className="font-semibold">{priceFormatted}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Sales:</span>
          <span className="font-semibold">{listing.total_sales}</span>
        </div>

        {listing.total_sales && listing.total_sales > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Earnings:</span>
            <span className="font-semibold text-green-600">
              ${estimatedEarnings.toFixed(2)}
            </span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Listed {getRelativeDate(listing.created_at)}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" variant="outline" asChild className="flex-1">
            <Link href={`/marketplace/${listing.id}`}>
              <Eye className="mr-1 size-3" />
              View
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild className="flex-1">
            <Link href={`/components/${listing.chat.slug}`}>
              <Edit className="mr-1 size-3" />
              Component
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
