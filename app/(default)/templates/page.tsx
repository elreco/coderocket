import { HelpCircle } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";

import { getMarketplaceListings, getMarketplaceCategories } from "./actions";
import { TemplatesInfiniteScroll } from "./templates-infinite-scroll";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const searchQuery = search || "";

  const title = searchQuery
    ? `${searchQuery} - AI Component Templates | CodeRocket Templates`
    : "Templates - AI Component Templates | CodeRocket";

  const description = searchQuery
    ? `Discover AI component templates for "${searchQuery}". Free and premium options available. Source code included, GitHub export. 1000+ templates available.`
    : "Browse free and premium AI component templates created by experts. Landing pages, UI components, email templates. Source code included, direct GitHub export.";

  return {
    title,
    description,
    keywords: [
      "AI components",
      "React templates",
      "landing pages",
      "UI components",
      "templates",
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
      url: "https://www.coderocket.app/templates",
      title,
      description,
      siteName: "CodeRocket",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "CodeRocket Templates - Premium AI Components",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@coderocketapp",
      images: ["/og.png"],
    },
    alternates: {
      canonical: "https://www.coderocket.app/templates",
    },
  };
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    categories?: string;
    framework?: string;
    price?: string;
  }>;
}) {
  const { search, categories, framework, price } = await searchParams;
  const searchQuery = search || "";
  const initialSelectedCategories = categories
    ? categories.split(",").filter(Boolean)
    : [];
  const initialSelectedFramework = framework || "";
  const initialPriceFilter = (price as "all" | "free" | "premium") || "all";

  const categoryId =
    initialSelectedCategories.length > 0
      ? Number(initialSelectedCategories[0])
      : undefined;

  const [initialTemplatesData, initialPopularTemplatesData, initialCategories] =
    await Promise.all([
      getMarketplaceListings({
        limit: 20,
        offset: 0,
        categoryId,
        search: searchQuery,
        framework: initialSelectedFramework || undefined,
        sortBy: "newest",
        priceFilter: initialPriceFilter,
      }),
      getMarketplaceListings({
        limit: 4,
        offset: 0,
        categoryId,
        search: searchQuery,
        framework: initialSelectedFramework || undefined,
        sortBy: "popular",
        priceFilter: initialPriceFilter,
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
            name: "CodeRocket Templates",
            description:
              "Free and premium AI component templates for developers",
            url: "https://www.coderocket.app/templates",
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
                "https://www.coderocket.app/templates?search={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <PageTitle
            title="Templates"
            subtitle="Discover free and premium AI-generated component templates"
          />
        </div>
        <div className="mb-8">
          <Button variant="outline" asChild>
            <Link href="https://docs.coderocket.app/templates/overview">
              <HelpCircle className="mr-2 size-4" />
              How it works?
            </Link>
          </Button>
        </div>
      </div>
      <div className="pb-10">
        <TemplatesInfiniteScroll
          initialTemplates={initialTemplatesData.listings}
          initialPopularTemplates={initialPopularTemplatesData.listings}
          initialCategories={initialCategories}
          initialSearchQuery={searchQuery}
          initialSelectedCategories={initialSelectedCategories}
          initialSelectedFramework={initialSelectedFramework}
          initialPriceFilter={initialPriceFilter}
        />
      </div>
    </Container>
  );
}
