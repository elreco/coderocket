import {
  Calendar,
  Plus,
  Heart,
  GitFork,
  Star,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSubscription } from "@/app/supabase-server";
import { ComponentCard } from "@/components/component-card";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UnifiedCard, UnifiedCardData } from "@/components/unified-card";
import { avatarApi, Framework } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

import {
  getUser,
  getLatestComponentsByUserId,
  getLatestActivityByUserId,
  getLikesCountByUserId,
  getComponentsCountByUserId,
  getRemixesCountByUserId,
  getMarketplaceStats,
  getLatestMarketplaceListingsByUserId,
} from "./actions";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id } = await params;

  const user = await getUser(id);
  if (!user) {
    return {
      title: "User not found - CodeRocket",
    };
  }

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];
  return {
    title: user.full_name
      ? `${user.full_name} - CodeRocket`
      : "Anonymous user - CodeRocket",
    description: `${user.full_name || "Anonymous user"} - CodeRocket`,
    openGraph: {
      images: [user.avatar_url ? user.avatar_url : "", ...previousImages],
    },
  };
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  const subscription = await getSubscription(user.id);
  const latestComponents = await getLatestComponentsByUserId(
    user.id,
    5,
    0,
    false,
    "",
  );
  const latestActivity = await getLatestActivityByUserId(user.id);
  const getComponentsCount = await getComponentsCountByUserId(user.id);
  const getRemixesCount = await getRemixesCountByUserId(user.id);
  const getLikesCount = await getLikesCountByUserId(user.id);
  const marketplaceStats = await getMarketplaceStats(user.id);
  const latestMarketplaceListings = await getLatestMarketplaceListingsByUserId(
    user.id,
    5,
  );

  return (
    <Container>
      <PageTitle title={user.full_name || "No name"} subtitle="User profile" />
      <div className="grid grid-cols-1 gap-4 pb-4 xl:grid-cols-3">
        <div className="col-span-1">
          <Card className="mb-4">
            <CardContent className="relative">
              {!subscription ? (
                <Badge className="hover:bg-primary absolute top-2 right-2">
                  Free user
                </Badge>
              ) : (
                <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-500">
                  Pro user
                </Badge>
              )}
              <div className="flex items-center justify-center py-6 lg:py-10">
                <div className="w-full space-y-6 lg:space-y-12">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="border-primary size-16 border lg:size-20">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        <img
                          src={`${avatarApi}${user.full_name}`}
                          alt="logo"
                          className="size-full"
                        />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-center">
                      <h5 className="mb-1 text-base font-semibold lg:text-lg">
                        {user.full_name}
                      </h5>
                      <TooltipProvider>
                        <div className="flex items-center gap-2 text-xs lg:text-sm">
                          <Calendar className="text-muted-foreground size-4" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{getRelativeDate(user.created_at)}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Account creation date</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x text-center">
                    <div className="px-1 lg:px-2">
                      <h5 className="text-base font-semibold lg:text-lg">
                        {getComponentsCount}
                      </h5>
                      <div className="text-muted-foreground text-xs lg:text-sm">
                        Components
                      </div>
                    </div>
                    <div className="px-1 lg:px-2">
                      <h5 className="text-base font-semibold lg:text-lg">
                        {getRemixesCount}
                      </h5>
                      <div className="text-muted-foreground text-xs lg:text-sm">
                        Remixes
                      </div>
                    </div>
                    <div className="px-1 lg:px-2">
                      <h5 className="text-base font-semibold lg:text-lg">
                        {getLikesCount}
                      </h5>
                      <div className="text-muted-foreground text-xs lg:text-sm">
                        Likes
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h5 className="my-4 text-lg font-semibold">Latest activity</h5>
              <div className="flex flex-col gap-y-4">
                {latestActivity.length > 0 ? (
                  latestActivity.map((activity) => (
                    <Link
                      href={`/components/${activity.chat?.slug || activity.chat?.id}`}
                      key={`${activity.type}-${activity.data.id}`}
                      className="block w-full transition-opacity hover:opacity-80"
                    >
                      <div className="flex items-center justify-between gap-x-3">
                        <div className="flex min-w-0 flex-1 items-center gap-x-3">
                          <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                              activity.type === "like"
                                ? "bg-pink-500"
                                : activity.type === "remix"
                                  ? "bg-blue-500"
                                  : "bg-primary"
                            } text-primary-foreground`}
                          >
                            {activity.type === "like" && (
                              <Heart className="size-4" />
                            )}
                            {activity.type === "remix" && (
                              <GitFork className="size-4" />
                            )}
                            {activity.type === "creation" && (
                              <Plus className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {activity.chat?.title || "Untitled Component"}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {activity.type === "like" && "Liked a component"}
                              {activity.type === "remix" &&
                                "Remixed a component"}
                              {activity.type === "creation" &&
                                "Created a component"}
                            </p>
                          </div>
                        </div>
                        <p className="text-muted-foreground shrink-0 text-sm whitespace-nowrap">
                          {getRelativeDate(activity.created_at)}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <p className="text-muted-foreground text-sm">
                      No activity yet
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent>
              <h5 className="my-4 text-lg font-semibold">
                {marketplaceStats.isMarketplaceSeller
                  ? "Marketplace Seller"
                  : "Marketplace Stats"}
              </h5>
              <div className="space-y-4">
                {/* Stats Grid */}
                <div className="flex justify-center">
                  <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
                    <div className="flex size-10 items-center justify-center rounded-full bg-green-500 text-white">
                      <ShoppingCart className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        Total Sales
                      </p>
                      <p className="text-lg font-bold text-green-900 dark:text-green-100">
                        {marketplaceStats.totalSales}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Listings Stats */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="rounded-lg border p-3">
                    <p className="text-2xl font-bold">
                      {marketplaceStats.totalListings}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Total Listings
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-2xl font-bold">
                      {marketplaceStats.activeListings}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Active Listings
                    </p>
                  </div>
                </div>

                {/* Top Selling Component */}
                {marketplaceStats.topSellingListing &&
                  (marketplaceStats.topSellingListing.total_sales || 0) > 0 && (
                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Star className="size-4 text-yellow-500" />
                        <p className="font-medium">Top Selling Component</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="truncate font-medium">
                            {marketplaceStats.topSellingListing.title}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {marketplaceStats.topSellingListing.total_sales ||
                              0}{" "}
                            uses
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            $
                            {(
                              marketplaceStats.topSellingListing.price_cents /
                              100
                            ).toFixed(2)}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            $
                            {(
                              (marketplaceStats.topSellingListing.price_cents *
                                (marketplaceStats.topSellingListing
                                  .total_sales || 0) *
                                0.7) /
                              100
                            ).toFixed(2)}{" "}
                            earned
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Marketplace Badge */}
                {marketplaceStats.isMarketplaceSeller &&
                  marketplaceStats.joinedMarketplaceAt && (
                    <div className="bg-primary/10 flex items-center justify-center gap-2 rounded-lg p-3">
                      <TrendingUp className="text-primary size-4" />
                      <span className="text-primary text-sm font-medium">
                        Marketplace Seller since{" "}
                        {new Date(
                          marketplaceStats.joinedMarketplaceAt,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="col-span-1 xl:col-span-2">
          <CardContent>
            <h5 className="my-4 text-base font-semibold lg:text-lg">
              Latest components
            </h5>
            {latestComponents.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                {latestComponents.length > 0 && (
                  <div className="sm:col-span-3">
                    <ComponentCard chat={latestComponents[0]} isReverse />
                  </div>
                )}
                {latestComponents.length > 1 && (
                  <div className="sm:col-span-3">
                    <ComponentCard chat={latestComponents[1]} isReverse />
                  </div>
                )}
                {latestComponents.length > 2 && (
                  <div className="sm:col-span-2">
                    <ComponentCard chat={latestComponents[2]} isReverse />
                  </div>
                )}
                {latestComponents.length > 3 && (
                  <div className="sm:col-span-2">
                    <ComponentCard chat={latestComponents[3]} isReverse />
                  </div>
                )}
                {latestComponents.length > 4 && (
                  <div className="sm:col-span-2">
                    <ComponentCard chat={latestComponents[4]} isReverse />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No components created yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Marketplace Listings */}
        <Card className="col-span-1 xl:col-span-2">
          <CardContent>
            <h5 className="my-4 text-base font-semibold lg:text-lg">
              Latest templates listings
            </h5>
            {latestMarketplaceListings.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                {latestMarketplaceListings.length > 0 && (
                  <div className="sm:col-span-3">
                    <UnifiedCard
                      data={formatListingForUnifiedCard(
                        latestMarketplaceListings[0],
                        user.id,
                      )}
                      isReverse
                    />
                  </div>
                )}
                {latestMarketplaceListings.length > 1 && (
                  <div className="sm:col-span-3">
                    <UnifiedCard
                      data={formatListingForUnifiedCard(
                        latestMarketplaceListings[1],
                        user.id,
                      )}
                      isReverse
                    />
                  </div>
                )}
                {latestMarketplaceListings.length > 2 && (
                  <div className="sm:col-span-2">
                    <UnifiedCard
                      data={formatListingForUnifiedCard(
                        latestMarketplaceListings[2],
                        user.id,
                      )}
                      isReverse
                    />
                  </div>
                )}
                {latestMarketplaceListings.length > 3 && (
                  <div className="sm:col-span-2">
                    <UnifiedCard
                      data={formatListingForUnifiedCard(
                        latestMarketplaceListings[3],
                        user.id,
                      )}
                      isReverse
                    />
                  </div>
                )}
                {latestMarketplaceListings.length > 4 && (
                  <div className="sm:col-span-2">
                    <UnifiedCard
                      data={formatListingForUnifiedCard(
                        latestMarketplaceListings[4],
                        user.id,
                      )}
                      isReverse
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No marketplace listings yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

// Type pour les listings avec relations
type MarketplaceListingWithRelations = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  total_sales: number | null;
  is_active: boolean | null;
  created_at: string;
  chat_id: string;
  version: number;
  screenshot: string | null;
  chat: {
    id: string;
    title: string | null;
    framework: string | null;
    slug: string | null;
  } | null;
  category: {
    id: number;
    name: string;
  } | null;
};

// Fonction pour formater les données de listing pour UnifiedCard
function formatListingForUnifiedCard(
  listing: MarketplaceListingWithRelations,
  currentUserId?: string,
): UnifiedCardData {
  return {
    id: listing.id,
    title: listing.title,
    imageUrl: listing.screenshot || undefined,
    framework: (listing.chat?.framework || Framework.HTML) as Framework,
    createdAt: listing.created_at,
    author: {
      id: currentUserId || "unknown",
      name: "You",
    },
    href: `/templates/${listing.id}`,
    price: listing.price_cents,
    currency: listing.currency,
    category: {
      name: listing.category?.name || "Uncategorized",
    },
    totalSales: listing.total_sales || 0,
    isOwnItem: true, // Toujours true car c'est le profil de l'utilisateur
  };
}
