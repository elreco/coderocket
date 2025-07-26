"use client";

import { useEffect, useState } from "react";

export interface StripeStatus {
  hasAccount: boolean;
  onboardingComplete: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useStripeStatus() {
  const [status, setStatus] = useState<StripeStatus>({
    hasAccount: false,
    onboardingComplete: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStripeStatus = async () => {
      try {
        const response = await fetch("/api/stripe-connect/account-status");

        if (!response.ok) {
          throw new Error("Failed to fetch Stripe status");
        }

        const data = await response.json();

        setStatus({
          hasAccount: data.hasAccount || false,
          onboardingComplete: data.onboardingComplete || false,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setStatus({
          hasAccount: false,
          onboardingComplete: false,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    fetchStripeStatus();
  }, []);

  const canCreateListing = status.hasAccount && status.onboardingComplete;
  const needsOnboarding = !status.hasAccount || !status.onboardingComplete;

  return {
    ...status,
    canCreateListing,
    needsOnboarding,
    refresh: () => {
      setStatus((prev) => ({ ...prev, isLoading: true }));
      // Re-trigger the effect by updating a dependency
    },
  };
}
