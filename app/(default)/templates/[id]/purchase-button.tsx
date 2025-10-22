"use client";

import { Loader, ShoppingCart, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import { type MarketplaceListing } from "../actions";

interface PurchaseButtonProps {
  listing: MarketplaceListing;
}

export function PurchaseButton({ listing }: PurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handlePurchase = async () => {
    setIsLoading(true);

    try {
      // Handle free templates differently
      if (listing.price_cents === 0) {
        // For free templates, call the purchase action directly
        const response = await fetch("/api/templates/use-free-template", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            listingId: listing.id,
            sellerId: listing.seller_id,
            chatId: listing.chat_id,
            version: listing.version,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401 && data.requiresAuth) {
            const currentUrl = window.location.pathname;
            router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
            return;
          }
          throw new Error(data.error || "Failed to use template");
        }

        toast({
          title: "Success!",
          description: "Template is now available in your components.",
        });

        // Redirect to the user's component
        router.push(`/components/${data.slug}`);
        return;
      }

      // For paid templates, use Stripe checkout
      // Calculate commission (30% to platform, 70% to seller)
      const platformCommissionCents = Math.round(listing.price_cents * 0.3);
      const sellerEarningCents = listing.price_cents - platformCommissionCents;

      const response = await fetch("/api/templates/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId: listing.id,
          sellerId: listing.seller_id,
          chatId: listing.chat_id,
          version: listing.version,
          priceCents: listing.price_cents,
          platformCommissionCents,
          sellerEarningCents,
          productName: listing.title,
          productDescription: listing.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if user needs to authenticate
        if (response.status === 401 && data.requiresAuth) {
          // Store the current URL to redirect back after login
          const currentUrl = window.location.pathname;
          router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
          return;
        }

        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.sessionUrl;
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: "Purchase Failed",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const priceFormatted =
    listing.price_cents === 0
      ? "Free"
      : `$${(listing.price_cents / 100).toFixed(2)}`;

  return (
    <Button
      onClick={handlePurchase}
      disabled={isLoading}
      className="w-full"
      variant={listing.price_cents === 0 ? "outline" : "default"}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader className="size-4 animate-spin" />
          <span>
            {listing.price_cents === 0 ? "Using template..." : "Processing..."}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {listing.price_cents === 0 ? (
            <>
              <Copy className="size-4" />
              <span>Use This Template</span>
            </>
          ) : (
            <>
              <ShoppingCart className="size-4" />
              <span>Purchase for {priceFormatted}</span>
            </>
          )}
        </div>
      )}
    </Button>
  );
}
