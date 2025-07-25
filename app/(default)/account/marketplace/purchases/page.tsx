import {
  Download,
  ExternalLink,
  DollarSign,
  ShoppingCart,
  Eye,
  Plus,
} from "lucide-react";
import Link from "next/link";

import { getUserMarketplacePurchases } from "@/app/(default)/marketplace/actions";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedCard, UnifiedCardData } from "@/components/unified-card";
import { Framework } from "@/utils/config";

export const metadata = {
  title: "My Purchases - CodeRocket",
  description: "Access your purchased components and download them.",
};

export default async function MyPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string; listing?: string }>;
}) {
  const params = await searchParams;
  const purchases = await getUserMarketplacePurchases();

  const totalSpent = purchases.reduce(
    (sum, purchase) => sum + purchase.price_paid_cents,
    0,
  );
  const totalComponents = purchases.length;

  // Show success message if redirected from successful purchase
  const showSuccessMessage = params.purchase === "success" && params.listing;

  return (
    <Container className="pr-2 sm:pr-11">
      <PageTitle
        title="My Purchases"
        subtitle="Access and download your purchased components"
      />
      <div className="mb-8 flex gap-4">
        <Button asChild>
          <Link href="/marketplace" className="flex items-center gap-2">
            <ShoppingCart className="size-4" />
            <span>Browse Marketplace</span>
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/marketplace/create" className="flex items-center gap-2">
            <Plus className="size-4" />
            <span>Sell Components</span>
          </Link>
        </Button>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
                <ShoppingCart className="size-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">
                  Purchase Successful!
                </p>
                <p className="text-sm text-green-600">
                  Your component has been added to your purchases. You can now
                  download it and access the code.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Purchases
            </CardTitle>
            <ShoppingCart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalComponents}</div>
            <p className="text-xs text-muted-foreground">Components owned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalSpent / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all purchases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Purchase</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {totalComponents > 0
                ? (totalSpent / totalComponents / 100).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Average component price
            </p>
          </CardContent>
        </Card>
      </div>

      {purchases.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No purchases yet</h3>
              <p className="text-muted-foreground">
                Browse the marketplace to find amazing components created by the
                community.
              </p>
            </div>
            <Button asChild>
              <Link href="/marketplace">
                <ShoppingCart className="mr-2 size-4" />
                Browse Marketplace
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 pb-10">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchases.map((purchase) => (
              <PurchaseCard key={purchase.id} purchase={purchase} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}

function PurchaseCard({
  purchase,
}: {
  purchase: Awaited<ReturnType<typeof getUserMarketplacePurchases>>[0];
}) {
  const actionsContent = (
    <>
      <Button size="sm" variant="outline" asChild className="flex-1">
        <Link href={`/marketplace/${purchase.listing.id}`}>
          <Eye className="mr-1 size-3" />
          View
        </Link>
      </Button>
      {purchase.purchased_chat_id ? (
        <Button size="sm" asChild className="flex-1">
          <Link href={`/components/${purchase.purchased_chat_id}`}>
            <Download className="mr-1 size-3" />
            Access
          </Link>
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="flex-1" disabled>
          <Download className="mr-1 size-3" />
          Processing...
        </Button>
      )}
    </>
  );

  const cardData: UnifiedCardData = {
    id: purchase.id,
    title: purchase.listing.title,
    imageUrl: purchase.listing.preview_image_url || undefined,
    framework: (purchase.listing.chat.framework || Framework.HTML) as Framework,
    createdAt: purchase.created_at,
    author: {
      id: purchase.listing.seller.id,
      name: purchase.listing.seller.full_name || "Anonymous",
    },
    href: `/marketplace/${purchase.listing.id}`,
    price: purchase.price_paid_cents,
    currency: purchase.currency,
    category: {
      name: purchase.listing.category.name,
    },
    badges: [
      {
        text: purchase.listing.chat.framework?.toUpperCase() || "HTML",
        variant: "outline",
        className: "font-mono text-xs",
      },
    ],
    actions: actionsContent,
    stats: [
      {
        icon: <DollarSign className="size-3" />,
        value: `Paid: ${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: purchase.currency,
        }).format(purchase.price_paid_cents / 100)}`,
        className: "font-semibold",
      },
    ],
  };

  return (
    <div className="group transition-all duration-200 hover:shadow-lg">
      <UnifiedCard data={cardData} showActions className="cursor-default" />

      {/* Help Text */}
      <div className="rounded-b-md border-t bg-card px-4 pb-4 pt-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-1">
          <ExternalLink className="size-3" />
          Need to modify this component?{" "}
          <Link
            href="https://docs.coderocket.app/github"
            target="_blank"
            className="underline hover:no-underline"
          >
            View docs
          </Link>
        </p>
      </div>
    </div>
  );
}
