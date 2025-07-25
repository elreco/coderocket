import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import {
  ArrowLeft,
  Calendar,
  Download,
  Tag,
  User,
  BookOpen,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { avatarApi } from "@/utils/config";
import { Framework } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { createClient } from "@/utils/supabase/server";

import { getMarketplaceListing } from "../actions";

import { PurchaseButton } from "./purchase-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getMarketplaceListing(id);

  if (!listing) {
    return {
      title: "Listing Not Found - CodeRocket Marketplace",
    };
  }

  return {
    title: `${listing.title} - CodeRocket Marketplace`,
    description: listing.description,
    openGraph: {
      title: listing.title,
      description: listing.description,
      type: "website",
      images: listing.screenshot ? [listing.screenshot] : undefined,
    },
  };
}

export default async function MarketplaceListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getMarketplaceListing(id);

  if (!listing) {
    notFound();
  }

  // Check if current user is the seller
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const isOwnListing = userData.user?.id === listing.seller_id;

  const priceFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: listing.currency,
  }).format(listing.price_cents / 100);

  const FrameworkIcon =
    listing.chat.framework === Framework.REACT
      ? SiReact
      : listing.chat.framework === Framework.VUE
        ? SiVuedotjs
        : SiHtml5;

  return (
    <Container className="pr-2 sm:pr-11">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/marketplace" className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Back to Marketplace
          </Link>
        </Button>
      </div>

      <PageTitle
        title="Component Details"
        subtitle="View and purchase premium AI-generated components"
      />

      <div className="grid gap-8 pb-5 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Component Preview Image */}
          {listing.screenshot && (
            <Link href={`/marketplace/${listing.id}/demo`}>
              <div className="group relative cursor-pointer overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 p-1 shadow-lg transition-all duration-300 hover:border-primary/40 hover:shadow-xl">
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Demo button - floating */}
                <div className="absolute right-4 top-4 z-10 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="rounded-md border border-primary/20 bg-primary/90 px-3 py-1 text-xs font-medium text-primary-foreground shadow-lg backdrop-blur-sm">
                    Live Demo
                  </div>
                </div>

                {/* Image container */}
                <div className="relative overflow-hidden rounded-lg bg-background/50 backdrop-blur-sm">
                  <img
                    src={listing.screenshot}
                    alt={`Preview of ${listing.title}`}
                    className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />

                  {/* Subtle overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-1/2 h-1 w-0 bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 group-hover:left-0 group-hover:w-full" />
              </div>
            </Link>
          )}

          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{listing.category.name}</Badge>
              <Badge className="hover:bg-primary">
                <FrameworkIcon className="mr-1 size-3" />
                <span className="first-letter:uppercase">
                  {listing.chat.framework}
                </span>
              </Badge>
              {(listing.total_sales || 0) > 0 && (
                <Badge variant="outline">
                  {listing.total_sales} sale
                  {listing.total_sales !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              {listing.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="size-6 border border-primary">
                  <AvatarImage src={listing.seller.avatar_url || undefined} />
                  <AvatarFallback>
                    <img
                      src={`${avatarApi}${listing.seller.full_name}`}
                      alt="seller"
                      className="size-full"
                    />
                  </AvatarFallback>
                </Avatar>
                <Link
                  href={`/users/${listing.seller.id}`}
                  className="font-medium hover:text-primary"
                >
                  {listing.seller.full_name || "Anonymous"}
                </Link>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="size-4" />
                <span>Listed {getRelativeDate(listing.created_at)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Description</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p className="whitespace-pre-wrap">{listing.description}</p>
            </div>
          </div>

          {/* Component Details */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Component Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="size-4" />
                    Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{listing.category.name}</p>
                  {listing.category.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {listing.category.description}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="size-4" />
                    Framework
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FrameworkIcon className="size-5" />
                    <span className="font-medium first-letter:uppercase">
                      {listing.chat.framework}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI-generated component
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Purchase Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{priceFormatted}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  One-time purchase
                </Badge>
              </div>
              <CardDescription>
                Get instant access to the complete component code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOwnListing ? (
                /* User's own listing */
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      This is your listing
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      You cannot purchase your own component
                    </p>
                  </div>
                  <Button className="w-full" asChild>
                    <Link href={`/components/${listing.chat.slug}`}>
                      View Component
                    </Link>
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" asChild>
                      <Link href="/account/marketplace/listings">
                        Manage Listings
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/marketplace/${listing.id}/manage`}>
                        Edit Listing
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Other user's listing */
                <Suspense fallback={<Button disabled>Loading...</Button>}>
                  <PurchaseButton listing={listing} />
                </Suspense>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Download className="size-4" />
                  <span>Instant download after purchase</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="size-4" />
                  <span>Commercial license included</span>
                </div>
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground">
                <p>
                  By purchasing, you agree to the{" "}
                  <Link href="/terms" className="underline hover:no-underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="underline hover:no-underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Seller Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About the Seller</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="border border-primary">
                  <AvatarImage src={listing.seller.avatar_url || undefined} />
                  <AvatarFallback>
                    <img
                      src={`${avatarApi}${listing.seller.full_name}`}
                      alt="seller"
                      className="size-full"
                    />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/users/${listing.seller.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {listing.seller.full_name || "Anonymous"}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Premium Creator
                  </p>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/users/${listing.seller.id}`}>View Profile</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">How to use purchased components</p>
                <p className="text-muted-foreground">
                  Learn how to modify and customize your purchased components.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0"
                  asChild
                >
                  <Link
                    href="https://docs.coderocket.app/github"
                    target="_blank"
                  >
                    View Documentation →
                  </Link>
                </Button>
              </div>

              <Separator />

              <div>
                <p className="font-medium">Questions about this component?</p>
                <p className="text-muted-foreground">
                  Contact our support team for assistance.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0"
                  asChild
                >
                  <Link
                    href="https://discord.gg/t7dQgcYJ5t"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contact Support →
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/50 p-6 text-center">
            <BookOpen className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-2 font-semibold">Need help customizing?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Learn how to modify and customize your purchased components
            </p>
            <Button asChild variant="outline" className="mt-3">
              <Link
                href="https://docs.coderocket.app/marketplace/customization"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Documentation
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}
