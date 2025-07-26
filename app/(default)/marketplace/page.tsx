import { HelpCircle } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";

import { getMarketplaceListings, getMarketplaceCategories } from "./actions";
import { MarketplaceInfiniteScroll } from "./marketplace-infinite-scroll";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const searchQuery = search || "";

  const title = searchQuery
    ? `${searchQuery} - Premium AI Components | CodeRocket Marketplace`
    : "Marketplace - Premium AI Components | CodeRocket";

  const description = searchQuery
    ? `Discover premium AI components for "${searchQuery}". Source code included, GitHub export, secure payment. 1000+ components available.`
    : "Buy premium AI components created by experts. Landing pages, UI components, email templates. Source code included, direct GitHub export.";

  return {
    title,
    description,
    keywords: [
      "AI components",
      "React templates",
      "landing pages",
      "UI components",
      "marketplace",
      "CodeRocket",
      "premium components",
      "Next.js templates",
      "email templates",
      "source code",
      "GitHub export",
    ].join(", "),
    authors: [{ name: "CodeRocket" }],
    creator: "CodeRocket",
    publisher: "CodeRocket",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "https://www.coderocket.app/marketplace",
      title,
      description,
      siteName: "CodeRocket",
      images: [
        {
          url: "/og-marketplace.png",
          width: 1200,
          height: 630,
          alt: "CodeRocket Marketplace - Premium AI Components",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@coderocket_app",
      images: ["/og-marketplace.png"],
    },
    alternates: {
      canonical: "https://www.coderocket.app/marketplace",
    },
  };
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; categories?: string }>;
}) {
  const { search, categories } = await searchParams;
  const searchQuery = search || "";
  const initialSelectedCategories = categories
    ? categories.split(",").filter(Boolean)
    : [];

  const categoryId =
    initialSelectedCategories.length > 0
      ? Number(initialSelectedCategories[0])
      : undefined;

  const [initialListingsData, initialPopularListingsData, initialCategories] =
    await Promise.all([
      getMarketplaceListings({
        limit: 20,
        offset: 0,
        categoryId,
        search: searchQuery,
        sortBy: "newest",
      }),
      getMarketplaceListings({
        limit: 4,
        offset: 0,
        categoryId,
        search: searchQuery,
        sortBy: "popular",
      }),
      getMarketplaceCategories(),
    ]);

  return (
    <Container className="pr-2 sm:pr-11">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Marketplace",
            name: "CodeRocket Marketplace",
            description: "Premium AI component marketplace for developers",
            url: "https://www.coderocket.app/marketplace",
            provider: {
              "@type": "Organization",
              name: "CodeRocket",
              url: "https://www.coderocket.app",
            },
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "USD",
              lowPrice: "5",
              highPrice: "199",
              offerCount: "1000+",
            },
            category: [
              "Landing Pages",
              "UI Components",
              "Email Templates",
              "Web Templates",
            ],
            potentialAction: {
              "@type": "SearchAction",
              target:
                "https://www.coderocket.app/marketplace?search={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <PageTitle
            title="Marketplace"
            subtitle="Discover and purchase premium AI-generated components"
          />
        </div>
        <div className="mb-8">
          <Button variant="outline" asChild>
            <Link href="/docs/marketplace/overview">
              <HelpCircle className="mr-2 size-4" />
              How it works?
            </Link>
          </Button>
        </div>
      </div>
      <div className="pb-10">
        <MarketplaceInfiniteScroll
          initialListings={initialListingsData.listings}
          initialPopularListings={initialPopularListingsData.listings}
          initialCategories={initialCategories}
          initialSearchQuery={searchQuery}
          initialSelectedCategories={initialSelectedCategories}
        />
      </div>
    </Container>
  );
}
