import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";

import { getMarketplaceListings, getMarketplaceCategories } from "./actions";
import { MarketplaceInfiniteScroll } from "./marketplace-infinite-scroll";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const searchQuery = search || "";
  return {
    title: searchQuery
      ? `Results for "${searchQuery}" - Marketplace - CodeRocket`
      : "Marketplace - CodeRocket",
    description: searchQuery
      ? `Discover premium AI components for "${searchQuery}".`
      : "Discover and purchase premium AI-generated components from our community of creators",
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
      <PageTitle
        title="Marketplace"
        subtitle="Discover and purchase premium AI-generated components"
      />
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
