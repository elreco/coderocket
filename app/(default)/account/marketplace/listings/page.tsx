import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import {
  Plus,
  Edit,
  Eye,
  EyeOff,
  Play,
  TrendingUp,
  DollarSign,
  ExternalLink,
  Calendar,
} from "lucide-react";
import Link from "next/link";

import { getUserMarketplaceListings } from "@/app/(default)/marketplace/actions";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

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
        <Button asChild>
          <Link href="/marketplace/create" className="flex items-center gap-2">
            <Plus className="size-4" />
            <span>Create New Listing</span>
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/marketplace" className="flex items-center gap-2">
            <Eye className="size-4" />
            <span>Browse Marketplace</span>
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
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-12 text-center">
          <h3 className="mb-4 text-lg font-semibold">No Listings Yet</h3>
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
        </div>
      ) : (
        <MyListingsClient initialListings={listings} />
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
        "w-full bg-center overflow-hidden relative card rounded-md mx-auto",
        "bg-secondary",
        !listing.is_active && "opacity-60",
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
            <Badge variant={listing.is_active ? "default" : "secondary"}>
              {listing.is_active ? "Active" : "Inactive"}
            </Badge>
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
        {/* Title and Category */}
        <div className="flex flex-col gap-0.5">
          <Link href={`/marketplace/${listing.id}`}>
            <h1 className="line-clamp-2 max-w-full whitespace-pre-wrap text-sm font-medium text-foreground hover:text-foreground/80">
              {listing.title}
            </h1>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {listing.category.name}
            </Badge>
            <span className="text-muted-foreground/60">•</span>
            <div className="flex items-center gap-1">
              <Calendar className="size-3" />
              {getRelativeDate(listing.created_at)}
            </div>
          </div>
        </div>

        {/* Sales info */}
        {(listing.total_sales || 0) > 0 && (
          <div className="rounded-lg bg-green-50 p-2 text-center">
            <p className="text-sm font-medium text-green-800">
              ${estimatedEarnings.toFixed(2)} earned
            </p>
            <p className="text-xs text-green-600">
              {listing.total_sales} sale{listing.total_sales !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Framework and Actions */}
        <div className="flex items-center justify-between">
          <Badge className="hover:bg-primary">
            <FrameworkIcon className="mr-1 size-3" />
            <span className="first-letter:uppercase">
              {listing.chat.framework}
            </span>
          </Badge>

          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/marketplace/${listing.id}`} title="View listing">
                <Eye className="size-3" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link
                href={`/marketplace/${listing.id}/manage`}
                title="Edit listing"
              >
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

export { ListingCard };
