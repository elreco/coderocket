"use client";

import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import {
  ArrowDown,
  ChevronDown,
  Loader,
  RefreshCcw,
  Search,
  SearchX,
  Tag,
  X,
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import { SmartCreateListingButton } from "@/components/smart-create-listing-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_SEARCH_LENGTH, Framework } from "@/utils/config";

import {
  getMarketplaceListings,
  type MarketplaceListing,
  type MarketplaceCategory,
} from "./actions";
import { MarketplaceCard } from "./marketplace-card";

const PAGE_SIZE = 20;
const MAX_PAGE = 40;

interface MarketplaceInfiniteScrollProps {
  initialListings: MarketplaceListing[];
  initialPopularListings: MarketplaceListing[];
  initialCategories: MarketplaceCategory[];
  initialSearchQuery?: string;
  initialSelectedCategories?: string[];
  initialSelectedFramework?: string;
}

export function MarketplaceInfiniteScroll({
  initialListings,
  initialPopularListings,
  initialCategories,
  initialSearchQuery = "",
  initialSelectedCategories = [],
  initialSelectedFramework = "",
}: MarketplaceInfiniteScrollProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- States ---
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialSelectedCategories,
  );
  const [selectedFramework, setSelectedFramework] = useState<string>(
    initialSelectedFramework,
  );
  const [categories] = useState<MarketplaceCategory[]>(initialCategories);

  const [listings, setListings] = useState<MarketplaceListing[]>(
    initialListings ?? [],
  );
  const [popularListings, setPopularListings] = useState<MarketplaceListing[]>(
    initialPopularListings ?? [],
  );

  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(
    (initialListings?.length ?? 0) === PAGE_SIZE,
  );

  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [frameworkDropdownOpen, setFrameworkDropdownOpen] = useState(false);

  const frameworks = [
    { value: Framework.REACT, label: "React", icon: SiReact },
    { value: Framework.VUE, label: "Vue", icon: SiVuedotjs },
    { value: Framework.HTML, label: "HTML", icon: SiHtml5 },
  ];

  const [searchParamsString, setSearchParamsString] = useState(
    searchParams.toString(),
  );

  // Update URL whenever searchParamsString changes
  useEffect(() => {
    const currentQueryString = searchParams.toString();
    if (searchParamsString !== currentQueryString) {
      router.replace(`${pathname}?${searchParamsString}`, { scroll: false });
    }
  }, [searchParamsString, searchParams, router, pathname]);

  // --- URL utility ---
  function updateURLQuery(
    query: string,
    categories?: string[],
    framework?: string,
  ) {
    const params = new URLSearchParams(searchParams.toString());

    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }

    if (categories && categories.length > 0) {
      params.set("categories", categories.join(","));
    } else {
      params.delete("categories");
    }

    if (framework) {
      params.set("framework", framework);
    } else {
      params.delete("framework");
    }

    setSearchParamsString(params.toString());
  }

  // --- Fetch data ---
  async function doFetchListings({
    pageToFetch,
    search = "",
    categories = [],
    framework = "",
    reset = false,
  }: {
    pageToFetch: number;
    search?: string;
    categories?: string[];
    framework?: string;
    reset?: boolean;
  }) {
    try {
      if (pageToFetch >= MAX_PAGE) {
        setHasMore(false);
        return;
      }
      setIsFetchingMore(true);

      const categoryId =
        categories.length > 0 ? Number(categories[0]) : undefined;
      const { listings: data, hasMore: moreAvailable } =
        await getMarketplaceListings({
          limit: PAGE_SIZE,
          offset: pageToFetch * PAGE_SIZE,
          categoryId,
          search: search,
          framework: framework || undefined,
          sortBy: "newest",
        });

      if (reset) {
        setListings(data);
        setPage(pageToFetch);
      } else {
        setListings((prev) => [...prev, ...data]);
        setPage(pageToFetch);
      }

      setHasMore(moreAvailable);
    } finally {
      setIsFetchingMore(false);
    }
  }

  async function doFetchPopularListings(
    search?: string,
    categories?: string[],
    framework?: string,
  ) {
    const categoryId =
      categories && categories.length > 0 ? Number(categories[0]) : undefined;
    const { listings: data } = await getMarketplaceListings({
      limit: 4,
      offset: 0,
      categoryId,
      search: search,
      framework: framework || undefined,
      sortBy: "popular",
    });
    setPopularListings(data);
  }

  // --- Handlers ---
  function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.slice(0, MAX_SEARCH_LENGTH);
    setSearchQuery(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitSearch();
    }
  }

  async function handleSubmitSearch() {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setShowSkeleton(true);

    updateURLQuery(searchQuery, selectedCategories, selectedFramework);

    await doFetchListings({
      pageToFetch: 0,
      search: searchQuery,
      categories: selectedCategories,
      framework: selectedFramework,
      reset: true,
    });
    await doFetchPopularListings(
      searchQuery,
      selectedCategories,
      selectedFramework,
    );

    setIsLoading(false);
    setTimeout(() => setShowSkeleton(false), 300);
  }

  async function handleClearSearch() {
    setSearchQuery("");
    setIsLoading(false);
    setShowSkeleton(false);

    updateURLQuery("", selectedCategories, selectedFramework);

    await doFetchListings({
      pageToFetch: 0,
      search: "",
      categories: selectedCategories,
      framework: selectedFramework,
      reset: true,
    });
    await doFetchPopularListings("", selectedCategories, selectedFramework);
  }

  async function handleCategorySelection(categoryId: string | null) {
    setIsLoading(true);
    setShowSkeleton(true);

    let newCategories: string[] = [];

    if (!categoryId) {
      newCategories = [];
    } else {
      if (selectedCategories.includes(categoryId)) {
        newCategories = selectedCategories.filter((c) => c !== categoryId);
      } else {
        newCategories = [...selectedCategories, categoryId];
      }
    }

    setSelectedCategories(newCategories);
    updateURLQuery(searchQuery, newCategories, selectedFramework);

    await doFetchListings({
      pageToFetch: 0,
      search: searchQuery,
      categories: newCategories,
      framework: selectedFramework,
      reset: true,
    });
    await doFetchPopularListings(searchQuery, newCategories, selectedFramework);

    setIsLoading(false);
    setTimeout(() => setShowSkeleton(false), 300);
  }

  async function handleFrameworkSelection(framework: string | null) {
    setIsLoading(true);
    setShowSkeleton(true);

    const newFramework = framework || "";
    setSelectedFramework(newFramework);
    updateURLQuery(searchQuery, selectedCategories, newFramework);

    await doFetchListings({
      pageToFetch: 0,
      search: searchQuery,
      categories: selectedCategories,
      framework: newFramework,
      reset: true,
    });
    await doFetchPopularListings(searchQuery, selectedCategories, newFramework);

    setIsLoading(false);
    setTimeout(() => setShowSkeleton(false), 300);
  }

  // --- Load More Handler ---
  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingMore) return;
    await doFetchListings({
      pageToFetch: page + 1,
      search: searchQuery,
      categories: selectedCategories,
      framework: selectedFramework,
    });
  }, [
    hasMore,
    isFetchingMore,
    page,
    searchQuery,
    selectedCategories,
    selectedFramework,
  ]);

  // Filter out popular from the public list to avoid duplicates
  const filteredListings = listings.filter(
    (listing) => !popularListings.some((pop) => pop.id === listing.id),
  );

  // Check if no results
  const hasNoResults =
    !showSkeleton && listings.length === 0 && popularListings.length === 0;

  return (
    <div>
      {/* Search bar & category filter */}
      <div className="flex flex-col items-center justify-between gap-2 space-y-2 sm:flex-row sm:space-y-0">
        <div className="relative flex w-full max-w-xl items-center rounded-md border border-border bg-secondary pl-3 focus-within:border-primary">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <Input
            id="search"
            placeholder="Search marketplace..."
            value={searchQuery}
            maxLength={MAX_SEARCH_LENGTH}
            onKeyDown={handleKeyDown}
            onChange={handleSearchInput}
            className="flex w-full rounded-md border-none bg-transparent py-3 text-sm font-normal outline-none placeholder:text-muted-foreground focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="ml-2 text-muted-foreground hover:text-primary"
            >
              <X className="size-4" />
            </button>
          )}
          <div className="flex items-center p-1">
            <Button
              onClick={handleSubmitSearch}
              disabled={isLoading}
              className="ml-1"
            >
              {isLoading ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Categories Filter */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="flex items-center gap-2 border border-border"
              >
                {selectedCategories.length > 0
                  ? selectedCategories
                      .map(
                        (catId) =>
                          categories.find((c) => c.id.toString() === catId)
                            ?.name,
                      )
                      .filter(Boolean)
                      .join(", ")
                  : "All Categories"}
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem
                key="all"
                className="flex cursor-pointer items-center space-x-2 capitalize text-primary"
                onClick={() => {
                  handleCategorySelection(null);
                  setDropdownOpen(false);
                }}
              >
                <Tag className="size-3" />
                All Categories
              </DropdownMenuItem>
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category.id}
                  checked={selectedCategories.includes(category.id.toString())}
                  className="flex cursor-pointer items-center space-x-2 capitalize"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleCategorySelection(category.id.toString());
                    setDropdownOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="size-3" />
                    <span>{category.name}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Frameworks Filter */}
          <DropdownMenu
            open={frameworkDropdownOpen}
            onOpenChange={setFrameworkDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="flex items-center gap-2 border border-border"
              >
                {selectedFramework ? (
                  <>
                    {(() => {
                      const framework = frameworks.find(
                        (f) => f.value === selectedFramework,
                      );
                      const IconComponent = framework?.icon || SiHtml5;
                      return (
                        <>
                          <IconComponent className="size-3" />
                          {framework?.label}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  "All Frameworks"
                )}
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem
                key="all-frameworks"
                className="flex cursor-pointer items-center space-x-2 capitalize text-primary"
                onClick={() => {
                  handleFrameworkSelection(null);
                  setFrameworkDropdownOpen(false);
                }}
              >
                <SiHtml5 className="size-3" />
                All Frameworks
              </DropdownMenuItem>
              {frameworks.map((framework) => {
                const IconComponent = framework.icon;
                return (
                  <DropdownMenuItem
                    key={framework.value}
                    className="flex cursor-pointer items-center space-x-2 capitalize"
                    onClick={() => {
                      handleFrameworkSelection(framework.value);
                      setFrameworkDropdownOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent className="size-3" />
                      <span>{framework.label}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Listing Button */}
          <SmartCreateListingButton>Create Listing</SmartCreateListingButton>
        </div>
      </div>

      {/* Popular first, then Public */}
      {hasNoResults ? (
        <div className="mt-6 flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary px-4 py-6 text-center">
          <SearchX className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No components found</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {searchQuery
              ? `No results found for "${searchQuery}". Try adjusting your search or filters.`
              : "No components available. Try changing your filters or search for something else."}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Button
              onClick={async () => {
                await handleClearSearch();
                await handleCategorySelection(null);
                await handleFrameworkSelection(null);
                setDropdownOpen(false);
                setFrameworkDropdownOpen(false);
              }}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RefreshCcw className="size-4" />
              <span>Clear search</span>
            </Button>
            <SmartCreateListingButton>Create Listing</SmartCreateListingButton>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 pb-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {showSkeleton
            ? // Loading skeleton
              [...Array(12)].map((_, i) => (
                <Skeleton key={i} className="h-[320px] w-full rounded-lg" />
              ))
            : // Popular
              [
                ...popularListings.map((listing) => (
                  <MarketplaceCard
                    key={`${listing.id}-popular`}
                    listing={listing}
                  />
                )),
                // Public (excluding duplicates)
                ...filteredListings.map((listing) => (
                  <MarketplaceCard key={listing.id} listing={listing} />
                )),
              ]}
        </div>
      )}

      {/* "Load More" Button */}
      {hasMore && !hasNoResults && !showSkeleton && (
        <div className="flex justify-center py-4">
          <Button
            variant="secondary"
            onClick={loadMore}
            disabled={isFetchingMore}
            className="flex items-center gap-2"
          >
            {isFetchingMore ? (
              <div className="flex items-center gap-2">
                <span>Loading...</span>
                <Loader className="size-4 animate-spin" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Load More</span>
                <ArrowDown className="size-4" />
              </div>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
