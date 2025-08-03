"use client";

import { useEffect, useState, useCallback } from "react";

export interface StripeStatus {
  hasAccount: boolean;
  onboardingComplete: boolean;
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
}

const CACHE_KEY = "stripe_status_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedStatus(): StripeStatus | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setCachedStatus(status: StripeStatus) {
  if (typeof window === "undefined") return;

  try {
    const cacheData = {
      data: status,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Ignore storage errors
  }
}

export function useStripeStatus() {
  const initialCachedStatus = getCachedStatus();
  const [status, setStatus] = useState<StripeStatus>(
    initialCachedStatus || {
      hasAccount: false,
      onboardingComplete: false,
      isPremium: false,
      isLoading: false, // Don't show loading by default
      error: null,
    },
  );

  const fetchStripeStatus = useCallback(async () => {
    // Check for cached data each time we call this function
    const currentCachedStatus = getCachedStatus();

    if (currentCachedStatus) {
      setStatus({ ...currentCachedStatus, isLoading: false });
      return;
    }

    // Set loading only if we don't have cached data
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
      setCachedStatus(newStatus);
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
    // Only use cache on mount, don't make API call automatically
    const cachedStatus = getCachedStatus();
    if (cachedStatus) {
      setStatus({ ...cachedStatus, isLoading: false });
    }
  }, []);

  const canCreateListing =
    status.isPremium && status.hasAccount && status.onboardingComplete;
  const needsOnboarding = !status.hasAccount || !status.onboardingComplete;
  const needsPremium = !status.isPremium;

  const refresh = useCallback(() => {
    // Clear cache and refetch
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(CACHE_KEY);
    }
    setStatus((prev) => ({ ...prev, isLoading: true }));
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
