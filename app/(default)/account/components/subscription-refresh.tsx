"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { toast } from "@/hooks/use-toast";

export default function SubscriptionRefresh() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasRefreshed, setHasRefreshed] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const fromCheckout = searchParams.get("from_checkout");

    if ((sessionId || fromCheckout) && !hasRefreshed) {
      toast({
        title: "Processing your subscription...",
        description:
          "Your payment is being processed. Page will refresh automatically.",
        duration: 5000,
      });

      const timer = setTimeout(() => {
        setHasRefreshed(true);
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("session_id");
          url.searchParams.delete("from_checkout");
          router.replace(url.pathname + url.search);
          router.refresh();
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, hasRefreshed, router]);

  return null;
}
