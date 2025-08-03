"use client";

import { useEffect, useState, useCallback } from "react";

export interface StripeStatus {
  hasAccount: boolean;
  onboardingComplete: boolean;
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useStripeStatus() {
  const [status, setStatus] = useState<StripeStatus>({
    hasAccount: false,
    onboardingComplete: false,
    isPremium: false,
    isLoading: false,
    error: null,
  });

  const fetchStripeStatus = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch("/api/stripe-connect/account-status");

      if (!response.ok) {
        throw new Error("Failed to fetch Stripe status");
      }

      const data = await response.json();

      const newStatus = {
        hasAccount: data.hasAccount || false,
        onboardingComplete: data.onboardingComplete || false,
        isPremium: data.isPremium || false,
        isLoading: false,
        error: null,
      };

      setStatus(newStatus);
    } catch (error) {
      const errorStatus = {
        hasAccount: false,
        onboardingComplete: false,
        isPremium: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      setStatus(errorStatus);
    }
  }, []);

  useEffect(() => {
    fetchStripeStatus();
  }, [fetchStripeStatus]);

  const canCreateListing =
    status.isPremium && status.hasAccount && status.onboardingComplete;
  const needsOnboarding = !status.hasAccount || !status.onboardingComplete;
  const needsPremium = !status.isPremium;

  const refresh = useCallback(() => {
    fetchStripeStatus();
  }, [fetchStripeStatus]);

  return {
    ...status,
    canCreateListing,
    needsOnboarding,
    needsPremium,
    refresh,
  };
}
