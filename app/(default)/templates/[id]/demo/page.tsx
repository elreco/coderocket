import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
} from "@icons-pack/react-simple-icons";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Framework } from "@/utils/config";
import { getDemoUrl } from "@/utils/demo-url";
import { createClient } from "@/utils/supabase/server";

import { getMarketplaceListing } from "../../actions";
import { PurchaseButton } from "../purchase-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getMarketplaceListing(id);

  if (!listing) {
    return {
      title: "Demo Not Found - CodeRocket Marketplace",
    };
  }

  return {
    title: `${listing.title} - Live Demo - CodeRocket Marketplace`,
    description: `Live demo of ${listing.title}`,
  };
}

export default async function MarketplaceDemoPage({
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

  // Generate demo URL
  const demoUrl = getDemoUrl(listing);

  const priceFormatted =
    listing.price_cents === 0
      ? "Free"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: listing.currency,
        }).format(listing.price_cents / 100);

  return (
    <div className="flex h-screen flex-col">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={`/templates/${listing.id}`}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-sm font-semibold">{listing.title}</h1>
              <p className="text-xs text-muted-foreground">Live Demo</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {listing.category.name}
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 text-xs"
            >
              {listing.chat.framework === Framework.REACT ? (
                <SiReact className="size-3" />
              ) : listing.chat.framework === Framework.VUE ? (
                <SiVuedotjs className="size-3" />
              ) : listing.chat.framework === Framework.SVELTE ? (
                <SiSvelte className="size-3" />
              ) : listing.chat.framework === Framework.ANGULAR ? (
                <SiAngular className="size-3" />
              ) : (
                <SiHtml5 className="size-3" />
              )}
              <span className="first-letter:uppercase">
                {listing.chat.framework}
              </span>
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            {listing.price_cents === 0 ? (
              <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
                FREE
              </Badge>
            ) : (
              <div className="text-lg font-semibold text-green-600">
                {priceFormatted}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {listing.price_cents === 0
                ? "Free template"
                : "One-time purchase"}
            </div>
          </div>

          {isOwnListing ? (
            <Button asChild>
              <Link href={`/components/${listing.chat.slug}`}>
                View Component
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={demoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 size-4" />
                  Open in New Tab
                </Link>
              </Button>
              <Suspense fallback={<Button disabled>Loading...</Button>}>
                <PurchaseButton listing={listing} />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {/* Demo iframe */}
      <div className="flex-1 bg-gray-100">
        <iframe
          src={demoUrl}
          className="size-full border-0"
          title={`Demo of ${listing.title}`}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        />
      </div>

      {/* Bottom info bar */}
      <div className="border-t bg-muted/50 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Demo hosted externally</span>
            <span>•</span>
            <span>Created by {listing.seller.full_name || "Anonymous"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by CodeRocket</span>
          </div>
        </div>
      </div>
    </div>
  );
}
