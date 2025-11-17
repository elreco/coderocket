import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
} from "@icons-pack/react-simple-icons";
import { DollarSign, Box, Eye, Calendar, Tag, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { getUserMarketplacePurchases } from "@/app/(default)/templates/actions";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { SmartCreateTemplateButton } from "@/components/smart-create-template-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Framework } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

import { DownloadCodeButton } from "./download-code-button";
import { PurchasesClient } from "./purchases-client";

export const metadata = {
  title: "My Templates - CodeRocket",
  description:
    "Access your used templates (free and premium) and download them.",
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
  const totalTemplates = purchases.length;

  // Show success message if redirected from successful purchase
  const showSuccessMessage = params.purchase === "success" && params.listing;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PurchasesClient>
        <Container className="pr-2 sm:pr-11">
          <PageTitle
            title="My Templates"
            subtitle="Access and download your used templates (free and premium)"
          />
          <div className="mb-8 flex gap-4">
            <Button asChild>
              <Link href="/templates" className="flex items-center gap-2">
                <Box className="size-4" />
                <span>Browse Templates</span>
              </Link>
            </Button>
            <SmartCreateTemplateButton
              variant="secondary"
              customText={{
                create: "Create Template",
              }}
            >
              Create Template
            </SmartCreateTemplateButton>
          </div>

          {/* Success Message */}
          {showSuccessMessage && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="size-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">
                      Template Added Successfully!
                    </p>
                    <p className="text-sm text-green-600">
                      Your template has been added to your collection. You can
                      now access it and download the code.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-muted-foreground text-sm font-medium">
                      Total Purchases
                    </CardTitle>
                    <div className="text-2xl font-bold">{totalTemplates}</div>
                  </div>
                  <div className="bg-muted rounded-full p-2">
                    <Box className="text-muted-foreground size-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  Total templates used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-muted-foreground text-sm font-medium">
                      Total Spent
                    </CardTitle>
                    <div className="text-2xl font-bold">
                      ${(totalSpent / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-muted rounded-full p-2">
                    <DollarSign className="text-muted-foreground size-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  Across all purchases
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-muted-foreground text-sm font-medium">
                      Avg. Purchase
                    </CardTitle>
                    <div className="text-2xl font-bold">
                      $
                      {totalTemplates > 0
                        ? (totalSpent / totalTemplates / 100).toFixed(2)
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
                  Average component price
                </p>
              </CardContent>
            </Card>
          </div>

          {purchases.length === 0 ? (
            <Card className="p-8 text-center">
              <CardContent className="space-y-4">
                <div className="bg-muted mx-auto flex size-16 items-center justify-center rounded-full">
                  <Box className="text-muted-foreground size-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    No templates used yet
                  </h3>
                  <p className="text-muted-foreground">
                    Browse templates to find amazing components created by the
                    community. You can use both free and premium templates.
                  </p>
                </div>
                <Button asChild>
                  <Link href="/templates">
                    <Box className="mr-2 size-4" />
                    Browse Templates
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 pb-10">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {purchases.map((purchase) => (
                  <PurchaseCard key={purchase.id} purchase={purchase} />
                ))}
              </div>
            </div>
          )}
        </Container>
      </PurchasesClient>
    </Suspense>
  );
}

function PurchaseCard({
  purchase,
}: {
  purchase: Awaited<ReturnType<typeof getUserMarketplacePurchases>>[0];
}) {
  const componentSlug =
    purchase.purchased_chat?.slug || purchase.purchased_chat_id;

  const CardWrapper = componentSlug
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={`/components/${componentSlug}`} className="block">
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

  // Framework icon logic to match other pages
  const FrameworkIcon =
    purchase.listing.chat.framework === Framework.REACT
      ? SiReact
      : purchase.listing.chat.framework === Framework.VUE
        ? SiVuedotjs
        : purchase.listing.chat.framework === Framework.SVELTE
          ? SiSvelte
          : purchase.listing.chat.framework === Framework.ANGULAR
            ? SiAngular
            : SiHtml5;

  return (
    <CardWrapper>
      <Card className="group flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-200 hover:shadow-lg">
        {/* Image */}
        <div
          className="relative aspect-video w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${
              purchase.listing.screenshot ||
              purchase.listing.preview_image_url ||
              "https://www.coderocket.app/placeholder.svg"
            })`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100">
            <Eye className="size-8 translate-y-4 text-white transition-transform duration-300 ease-in-out group-hover:translate-y-0" />
          </div>

          {/* Price Badge */}
          <div className="absolute top-3 right-3">
            {purchase.price_paid_cents === 0 ? (
              <Badge className="bg-emerald-500 text-white shadow-xs">
                FREE
              </Badge>
            ) : (
              <Badge className="bg-green-600 text-white shadow-xs">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: purchase.currency,
                }).format(purchase.price_paid_cents / 100)}
              </Badge>
            )}
          </div>

          {/* Used Badge */}
          <div className="absolute top-3 left-3">
            <Badge className="bg-blue-600 text-white shadow-xs">
              <CheckCircle className="mr-1 size-3" />
              Used
            </Badge>
          </div>
        </div>

        {/* Content */}
        <CardContent className="flex flex-1 flex-col p-4">
          <div className="flex flex-1 flex-col space-y-4">
            {/* Title and Details */}
            <div className="flex-1 space-y-2">
              <h3 className="text-foreground line-clamp-2 min-h-10 font-semibold">
                {purchase.listing.title}
              </h3>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span>
                  by{" "}
                  <Link
                    href={`/users/${purchase.listing.seller.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {purchase.listing.seller.full_name || "Anonymous"}
                  </Link>
                </span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  <span>Added {getRelativeDate(purchase.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Framework and Category */}
            <div className="flex items-center justify-between">
              <Badge className="hover:bg-primary">
                <FrameworkIcon className="mr-1 size-3" />
                <span className="first-letter:uppercase">
                  {purchase.listing.chat.framework || "html"}
                </span>
              </Badge>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <Tag className="size-3" />
                <span>{purchase.listing.category.name}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild size="sm">
                <Link href={`/templates/${purchase.listing.id}`}>
                  <Eye className="mr-1 size-3" />
                  View Template
                </Link>
              </Button>

              {componentSlug && (
                <DownloadCodeButton componentSlug={componentSlug} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}
