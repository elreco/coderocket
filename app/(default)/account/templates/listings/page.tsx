import { Eye, TrendingUp, DollarSign, Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getUserMarketplaceListings } from "@/app/(default)/templates/actions";
import { getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { SmartCreateTemplateButton } from "@/components/smart-create-template-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";

import { MyListingsClient } from "./my-listings-client";

async function checkUserAccess() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Check if user has premium subscription
  const subscription = await getSubscription();
  if (!subscription) {
    redirect("/pricing?reason=templates-listings");
  }

  return userData.user;
}

export default async function MyTemplatesPage() {
  await checkUserAccess();
  const listings = await getUserMarketplaceListings();

  const activeListings = listings.filter((l) => l.is_active);
  const inactiveListings = listings.filter((l) => !l.is_active);
  const totalSales = listings.reduce(
    (sum, listing) => sum + (listing.total_sales || 0),
    0,
  );
  const totalEarnings = listings.reduce((sum, listing) => {
    const earnings =
      (listing.price_cents * (listing.total_sales || 0) * 0.7) / 100;
    return sum + earnings;
  }, 0);

  return (
    <Container className="pr-2 sm:pr-11">
      <PageTitle
        title="My Templates"
        subtitle="Manage your templates and track uses"
      />
      <div className="mb-8 flex gap-4">
        <SmartCreateTemplateButton>Add New Template</SmartCreateTemplateButton>
        <Button asChild variant="secondary">
          <Link href="/templates" className="flex items-center gap-2">
            <Eye className="size-4" />
            <span>Browse Templates</span>
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link
            href="/account/templates/earnings"
            className="flex items-center gap-2"
          >
            <DollarSign className="size-4" />
            <span>Earnings & Payouts</span>
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link
            href="/account/templates/stripe-onboarding"
            className="flex items-center gap-2"
          >
            <Settings className="size-4" />
            <span>Stripe Dashboard</span>
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Total Listings
                </CardTitle>
                <div className="text-2xl font-bold">{listings.length}</div>
              </div>
              <div className="bg-muted rounded-full p-2">
                <Eye className="text-muted-foreground size-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">
              {activeListings.length} active, {inactiveListings.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Total Sales
                </CardTitle>
                <div className="text-2xl font-bold">{totalSales}</div>
              </div>
              <div className="bg-muted rounded-full p-2">
                <TrendingUp className="text-muted-foreground size-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">
              Across all components
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Estimated Earnings
                </CardTitle>
                <div className="text-2xl font-bold">
                  ${totalEarnings.toFixed(2)}
                </div>
              </div>
              <div className="bg-muted rounded-full p-2">
                <DollarSign className="text-muted-foreground size-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">
              70% after platform fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Avg. Sale Price
                </CardTitle>
                <div className="text-2xl font-bold">
                  $
                  {listings.length > 0
                    ? (
                        listings.reduce((sum, l) => sum + l.price_cents, 0) /
                        listings.length /
                        100
                      ).toFixed(2)
                    : "0.00"}
                </div>
              </div>
              <div className="bg-muted rounded-full p-2">
                <DollarSign className="text-muted-foreground size-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">
              Average listing price
            </p>
          </CardContent>
        </Card>
      </div>

      {listings.length === 0 ? (
        <div className="border-border bg-muted/50 rounded-lg border border-dashed p-12 pb-10 text-center">
          <h3 className="mb-4 text-lg font-semibold">No Templates Yet</h3>
          <p className="text-muted-foreground mb-6">
            You haven&apos;t created any templates yet. Start selling your
            components to earn money!
          </p>
          <SmartCreateTemplateButton
            customText={{
              create: "Create Your First Template",
            }}
          >
            Create Your First Template
          </SmartCreateTemplateButton>
        </div>
      ) : (
        <div className="pb-10">
          <MyListingsClient initialListings={listings} />
        </div>
      )}
    </Container>
  );
}
