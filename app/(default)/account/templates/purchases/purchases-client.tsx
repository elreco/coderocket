"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useToast } from "@/hooks/use-toast";

export function PurchasesClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const purchaseSuccess = searchParams.get("purchase");
    const listingId = searchParams.get("listing");

    if (purchaseSuccess === "success" && listingId) {
      // Refresh the page data to show the new purchase
      router.refresh();

      // Clean up the URL parameters after a short delay
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("purchase");
        url.searchParams.delete("listing");
        router.replace(url.pathname, { scroll: false });
      }, 2000);

      // Show success toast
      toast({
        title: "Template Added!",
        description: "Your template has been added to your collection.",
      });
    }
  }, [searchParams, router, toast]);

  return <>{children}</>;
}
