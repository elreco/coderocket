"use client";

import { formatDistance } from "date-fns";
import {
  DollarSign,
  TrendingUp,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface EarningsClientProps {
  userStripeData: {
    stripe_account_id: string | null;
    stripe_account_status: string | null;
    stripe_onboarding_completed: boolean;
    stripe_payouts_enabled: boolean;
  } | null;
  earnings: Array<{
    id: string;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
    marketplace_purchases: {
      listing_id: string;
      marketplace_listings: {
        title: string;
        price_cents: number;
      };
    };
  }>;
  payouts: Array<{
    id: string;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
    arrival_date: string | null;
    failure_reason: string | null;
  }>;
  availableEarnings: number;
}

export function EarningsClient({
  userStripeData,
  earnings,
  payouts,
  availableEarnings,
}: EarningsClientProps) {
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const { toast } = useToast();

  const totalEarnings = earnings.reduce(
    (sum, earning) => sum + earning.amount_cents,
    0,
  );
  const pendingEarnings = earnings
    .filter((e) => e.status === "pending")
    .reduce((sum, earning) => sum + earning.amount_cents, 0);
  const paidOut = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, payout) => sum + payout.amount_cents, 0);

  const handleRequestPayout = async () => {
    if (availableEarnings < 5000) {
      // $50 minimum
      toast({
        title: "Minimum Payout Amount",
        description:
          "You need at least $50.00 in available earnings to request a payout.",
        variant: "destructive",
      });
      return;
    }

    setIsRequestingPayout(true);
    try {
      const response = await fetch("/api/stripe-connect/create-payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_cents: availableEarnings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to request payout");
      }

      toast({
        title: "Payout Requested",
        description: `Your payout of $${(availableEarnings / 100).toFixed(2)} has been requested and will be processed shortly.`,
      });

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Payout Failed",
        description:
          error instanceof Error ? error.message : "Failed to request payout",
        variant: "destructive",
      });
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      const response = await fetch("/api/stripe-connect/dashboard-link", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open dashboard");
      }

      window.open(data.url, "_blank");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to open dashboard",
        variant: "destructive",
      });
    }
  };

  // No Stripe account setup
  if (!userStripeData?.stripe_account_id) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            You need to set up your Stripe account before you can view earnings
            and request payouts.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Set Up Payments</CardTitle>
            <CardDescription>
              Create your Stripe Express account to start receiving payments
              from your marketplace sales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/account/marketplace/stripe-onboarding">
                Set Up Stripe Account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Onboarding not complete
  if (!userStripeData.stripe_onboarding_completed) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Complete your Stripe account setup to access earnings and payouts.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Complete Setup</CardTitle>
            <CardDescription>
              Finish setting up your Stripe account to start receiving payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/account/marketplace/stripe-onboarding">
                Complete Setup
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Earnings
                </CardTitle>
                <div className="text-2xl font-bold">
                  ${(totalEarnings / 100).toFixed(2)}
                </div>
              </div>
              <div className="rounded-full bg-muted p-2">
                <DollarSign className="size-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">All time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Available
                </CardTitle>
                <div className="text-2xl font-bold text-green-600">
                  ${(availableEarnings / 100).toFixed(2)}
                </div>
              </div>
              <div className="rounded-full bg-muted p-2">
                <TrendingUp className="size-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending
                </CardTitle>
                <div className="text-2xl font-bold text-orange-600">
                  ${(pendingEarnings / 100).toFixed(2)}
                </div>
              </div>
              <div className="rounded-full bg-muted p-2">
                <Clock className="size-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">Processing (7 days)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Paid Out
                </CardTitle>
                <div className="text-2xl font-bold">
                  ${(paidOut / 100).toFixed(2)}
                </div>
              </div>
              <div className="rounded-full bg-muted p-2">
                <CheckCircle className="size-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">Total withdrawn</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
          <CardDescription>
            Withdraw your available earnings to your bank account. Minimum
            payout is $50.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Available for payout</div>
              <div className="text-sm text-muted-foreground">
                Earnings available after 7-day processing period
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                ${(availableEarnings / 100).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleRequestPayout}
              disabled={
                isRequestingPayout ||
                availableEarnings < 5000 ||
                !userStripeData.stripe_payouts_enabled
              }
              className="flex-1"
            >
              {isRequestingPayout ? "Processing..." : "Request Payout"}
            </Button>

            <Button
              variant="outline"
              onClick={handleOpenDashboard}
              disabled={!userStripeData.stripe_onboarding_completed}
            >
              <ExternalLink className="mr-2 size-4" />
              Stripe Dashboard
            </Button>
          </div>

          {availableEarnings < 5000 && (
            <p className="text-sm text-muted-foreground">
              You need at least $50.00 to request a payout.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Payouts */}
      {payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payouts</CardTitle>
            <CardDescription>Your payout history and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payouts.slice(0, 5).map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      ${(payout.amount_cents / 100).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistance(new Date(payout.created_at), new Date(), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        payout.status === "paid"
                          ? "default"
                          : payout.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {payout.status}
                    </Badge>
                    {payout.arrival_date && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Arrives{" "}
                        {formatDistance(
                          new Date(payout.arrival_date),
                          new Date(),
                          { addSuffix: true },
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Earnings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
          <CardDescription>Your latest sales and earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No earnings yet. Start selling components to see earnings here.
            </div>
          ) : (
            <div className="space-y-4">
              {earnings.slice(0, 10).map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <div className="line-clamp-1 font-medium">
                      {earning.marketplace_purchases.marketplace_listings.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistance(
                        new Date(earning.created_at),
                        new Date(),
                        { addSuffix: true },
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      ${(earning.amount_cents / 100).toFixed(2)}
                    </div>
                    <Badge
                      variant={
                        earning.status === "available"
                          ? "default"
                          : earning.status === "pending"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {earning.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
