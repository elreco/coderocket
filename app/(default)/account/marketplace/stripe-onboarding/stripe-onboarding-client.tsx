"use client";

import {
  CheckCircle,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Settings,
  FileText,
  Building,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

import { SmartCreateListingButton } from "@/components/smart-create-listing-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface StripeOnboardingClientProps {
  userData: {
    stripe_account_id: string | null;
    stripe_account_status: string | null;
    stripe_onboarding_completed: boolean | null;
    stripe_payouts_enabled: boolean | null;
  } | null;
  showSuccessMessage: boolean;
  needsRefresh: boolean;
}

export function StripeOnboardingClient({
  userData,
  showSuccessMessage,
  needsRefresh,
}: StripeOnboardingClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (showSuccessMessage && userData?.stripe_onboarding_completed) {
      toast({
        title: "Stripe Setup Complete! 🎉",
        description:
          "Your seller account is now active. You can start creating listings.",
      });
    }
  }, [showSuccessMessage, userData?.stripe_onboarding_completed, toast]);

  const handleCreateAccount = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe-connect/create-account", {
        method: "POST",
      });

      const data = await response.json();

      if (data.accountLinkUrl) {
        window.location.href = data.accountLinkUrl;
      } else {
        alert("Error creating account. Please try again.");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      alert("Error creating account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueOnboarding = async () => {
    if (!userData?.stripe_account_id) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe-connect/account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: userData.stripe_account_id }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Error continuing onboarding. Please try again.");
      }
    } catch (error) {
      console.error("Error continuing onboarding:", error);
      alert("Error continuing onboarding. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleSyncStatus = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/stripe-connect/sync-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Sync result:", data);

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const error = await response.json();
        console.error("Sync failed:", error);
        alert("Failed to sync status. Please try again.");
        setIsRefreshing(false);
      }
    } catch (error) {
      console.error("Error syncing status:", error);
      alert("Error syncing status. Please try again.");
      setIsRefreshing(false);
    }
  };

  const handleOpenDashboard = async () => {
    setIsOpeningDashboard(true);
    try {
      const response = await fetch("/api/stripe-connect/dashboard-link", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        alert("Error opening dashboard. Please try again.");
      }
    } catch (error) {
      console.error("Error opening dashboard:", error);
      alert("Error opening dashboard. Please try again.");
    } finally {
      setIsOpeningDashboard(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="font-medium">
                {userData?.stripe_onboarding_completed ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="size-4" />
                    Setup Complete
                  </span>
                ) : userData?.stripe_account_id ? (
                  <span className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="size-4" />
                    Setup In Progress
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-slate-600">
                    <AlertTriangle className="size-4" />
                    Setup Required
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {userData?.stripe_onboarding_completed
                  ? "Your account is ready to receive payments"
                  : userData?.stripe_account_id
                    ? "Complete your setup to start receiving payments"
                    : "Create your Stripe account to start selling"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  userData?.stripe_payouts_enabled ? "default" : "secondary"
                }
                className="whitespace-nowrap"
              >
                Payouts:{" "}
                {userData?.stripe_payouts_enabled ? "Enabled" : "Disabled"}
              </Badge>
              <Badge
                variant={
                  userData?.stripe_account_status === "enabled"
                    ? "default"
                    : "secondary"
                }
                className="whitespace-nowrap"
              >
                Status: {userData?.stripe_account_status || "Not Created"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Action Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Account Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!userData?.stripe_account_id ? (
            <div className="flex flex-col items-center space-y-4 text-center sm:flex-row sm:items-start sm:space-x-6 sm:space-y-0 sm:text-left">
              <div className="flex-1 space-y-2">
                <h3 className="font-medium">Create Your Stripe Account</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your Stripe Express account to start accepting payments
                  and manage your marketplace earnings.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={handleCreateAccount}
                  disabled={isLoading}
                  size="lg"
                  className="min-w-[180px]"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 size-4" />
                      Create Stripe Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : !userData?.stripe_onboarding_completed ? (
            <div className="flex flex-col items-center space-y-4 text-center sm:flex-row sm:items-start sm:space-x-6 sm:space-y-0 sm:text-left">
              <div className="flex-1 space-y-2">
                <h3 className="font-medium">Complete Your Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Finish configuring your Stripe account to start receiving
                  payments from your marketplace sales.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={handleContinueOnboarding}
                  disabled={isLoading}
                  size="lg"
                  className="min-w-[160px]"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 size-4" />
                      Complete Setup
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSyncStatus}
                  variant="outline"
                  size="lg"
                  disabled={isRefreshing}
                  className="min-w-[120px]"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 size-4" />
                      Force Sync
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : showSuccessMessage && !userData?.stripe_onboarding_completed ? (
            <div className="flex flex-col items-center space-y-4 text-center sm:flex-row sm:items-start sm:space-x-6 sm:space-y-0 sm:text-left">
              <div className="flex-1 space-y-2">
                <h3 className="font-medium">Setup Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Your Stripe setup is complete! Update your account information
                  to reflect the latest status.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  size="lg"
                  className="min-w-[140px]"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 size-4" />
                      Refresh Status
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSyncStatus}
                  variant="outline"
                  size="lg"
                  disabled={isRefreshing}
                  className="min-w-[120px]"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 size-4" />
                      Force Sync
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 text-center sm:flex-row sm:items-start sm:space-x-6 sm:space-y-0 sm:text-left">
              <div className="flex-1 space-y-2">
                <h3 className="flex items-center gap-2 font-medium text-green-600">
                  <CheckCircle className="size-4" />
                  Account Ready
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your account is fully set up and ready to receive payments.
                  Access your Stripe dashboard to manage your account.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={handleOpenDashboard}
                  disabled={isOpeningDashboard}
                  size="lg"
                  className="min-w-[180px]"
                >
                  {isOpeningDashboard ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 size-4" />
                      Open Stripe Dashboard
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRefreshStatus}
                  variant="outline"
                  size="lg"
                  disabled={isRefreshing}
                  className="min-w-[140px]"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 size-4" />
                      Refresh Status
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="size-5" />
            Marketplace Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Access your marketplace tools and manage your listings.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SmartCreateListingButton size="lg" className="min-w-[140px]">
                Create Listing
              </SmartCreateListingButton>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-w-[120px]"
              >
                <Link href="/account/marketplace/listings">My Listings</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-w-[120px]"
              >
                <Link href="/account/marketplace/earnings">Earnings</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Requirements & Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-medium">What you&apos;ll need:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Government-issued ID</li>
                  <li>• Bank account information</li>
                  <li>• Business information (if applicable)</li>
                  <li>• Tax information</li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-medium">Key benefits:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 70% revenue share</li>
                  <li>• Automatic payouts</li>
                  <li>• Fraud protection</li>
                  <li>• Global payment support</li>
                </ul>
              </div>
            </div>

            {needsRefresh && (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  Your account status may be outdated. Click &quot;Refresh
                  Status&quot; to get the latest information.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
