"use client";

import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import {
  ArrowDown,
  ChevronDown,
  Loader2,
  RefreshCcw,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import {
  type GetComponentsReturnType,
  getAllPublicChats,
} from "@/app/(default)/components/actions";
import { ComponentCard } from "@/components/component-card";
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
import { Framework, MAX_SEARCH_LENGTH } from "@/utils/config";

const PAGE_SIZE = 20;
const MAX_PAGE = 7;

interface ComponentsInfiniteScrollProps {
  initialChats: GetComponentsReturnType[] | null;
  initialPopularChats: GetComponentsReturnType[] | null;
  initialSearchQuery?: string;
  initialSelectedFrameworks?: Framework[];
  isAccountPage?: boolean;
}

export function ComponentsInfiniteScroll({
  initialChats,
  initialPopularChats,
  initialSearchQuery = "",
  initialSelectedFrameworks = [],
  isAccountPage = false,
}: ComponentsInfiniteScrollProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- States ---

  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [selectedFrameworks, setSelectedFrameworks] = useState<Framework[]>(
    initialSelectedFrameworks,
  );

  const [publicChats, setPublicChats] = useState<GetComponentsReturnType[]>(
    initialChats ?? [],
  );
  const [popularChats, setPopularChats] = useState<GetComponentsReturnType[]>(
    initialPopularChats ?? [],
  );

  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(
    (initialChats?.length ?? 0) === PAGE_SIZE,
  );

  // Avoid multiple fetches in parallel
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Store the final query in local state
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
  function updateURLQuery(query: string, frameworks?: Framework[]) {
    const params = new URLSearchParams(searchParams.toString());

    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }

    if (frameworks && frameworks.length > 0) {
      params.set("frameworks", frameworks.join(","));
    } else {
      params.delete("frameworks");
    }

    setSearchParamsString(params.toString());
  }

  // --- Fetch data ---
  async function doFetchPublicChats({
    pageToFetch,
    search = "",
    frameworks = [],
    reset = false,
  }: {
    pageToFetch: number;
    search?: string;
    frameworks?: Framework[];
    reset?: boolean;
  }) {
    try {
      if (pageToFetch >= MAX_PAGE) {
        setHasMore(false);
        return;
      }
      setIsFetchingMore(true);
      const data = await getAllPublicChats(
        PAGE_SIZE,
        pageToFetch * PAGE_SIZE,
        false,
        search,
        frameworks,
        isAccountPage,
      );
      const validData = data.filter(Boolean);

      if (reset) {
        setPublicChats(validData);
        setPage(pageToFetch);
      } else {
        setPublicChats((prev) => [...prev, ...validData]);
        setPage(pageToFetch);
      }

      // If fewer than PAGE_SIZE, no more data
      setHasMore(validData.length === PAGE_SIZE);
    } finally {
      setIsFetchingMore(false);
    }
  }

  async function doFetchPopularChats(
    search?: string,
    frameworks?: Framework[],
  ) {
    const data = await getAllPublicChats(
      4,
      0,
      true,
      search,
      frameworks,
      isAccountPage,
    );
    setPopularChats(data.filter(Boolean));
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
    // Don't launch if search is empty
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setShowSkeleton(true);

    updateURLQuery(searchQuery, selectedFrameworks);

    // Fetch public then popular
    await doFetchPublicChats({
      pageToFetch: 0,
      search: searchQuery,
      frameworks: selectedFrameworks,
      reset: true,
    });
    await doFetchPopularChats(searchQuery, selectedFrameworks);

    setIsLoading(false);
    setTimeout(() => setShowSkeleton(false), 300);
  }

  async function handleClearSearch() {
    setSearchQuery("");
    setIsLoading(false);
    setShowSkeleton(false);

    updateURLQuery("");

    await doFetchPublicChats({
      pageToFetch: 0,
      search: "",
      frameworks: selectedFrameworks,
      reset: true,
    });
    await doFetchPopularChats("", selectedFrameworks);
  }

  async function handleFrameworkSelection(framework: Framework | null) {
    setIsLoading(true);
    setShowSkeleton(true);

    let newFrameworks: Framework[] = [];

    if (!framework) {
      // Reset
      newFrameworks = [];
    } else {
      // Add / remove
      if (selectedFrameworks.includes(framework)) {
        newFrameworks = selectedFrameworks.filter((f) => f !== framework);
      } else {
        newFrameworks = [...selectedFrameworks, framework];
      }
    }

    setSelectedFrameworks(newFrameworks);
    updateURLQuery(searchQuery, newFrameworks);

    await doFetchPublicChats({
      pageToFetch: 0,
      search: searchQuery,
      frameworks: newFrameworks,
      reset: true,
    });
    await doFetchPopularChats(searchQuery, newFrameworks);

    setIsLoading(false);
    setTimeout(() => setShowSkeleton(false), 300);
  }

  // --- Load More Handler ---
  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingMore) return;
    await doFetchPublicChats({
      pageToFetch: page + 1,
      search: searchQuery,
      frameworks: selectedFrameworks,
    });
  }, [hasMore, isFetchingMore, page, searchQuery, selectedFrameworks]);

  // --- Icon per framework ---
  function FrameworkIcon(fw: Framework) {
    switch (fw) {
      case "react":
        return <SiReact className="size-4" />;
      case "html":
        return <SiHtml5 className="size-4" />;
      case "vue":
        return <SiVuedotjs className="size-4" />;
      default:
        return null;
    }
  }

  // Filter out popular from the public list to avoid duplicates
  const filteredPublicChats = publicChats.filter(
    (chat) => !popularChats.some((pop) => pop.chat_id === chat.chat_id),
  );

  // Check if no results
  const hasNoResults =
    !showSkeleton && publicChats.length === 0 && popularChats.length === 0;

  return (
    <div>
      {/* Search bar & frameworks filter */}
      <div className="flex flex-col items-center justify-start gap-2 space-y-2 sm:flex-row sm:space-y-0">
        <div className="relative flex w-full max-w-xl items-center rounded-md border border-border bg-secondary pl-3 focus-within:border-primary">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <Input
            id="search"
            placeholder="Search a component..."
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
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </div>

        {/* Frameworks Filter */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              variant="secondary"
              className="flex w-full items-center gap-2 border border-border p-[22px] sm:w-auto"
            >
              {selectedFrameworks.length > 0
                ? selectedFrameworks.map((fw) => (
                    <span key={fw} className="flex items-center gap-1">
                      {FrameworkIcon(fw)}
                      <span>{fw}</span>
                    </span>
                  ))
                : "Filter by Frameworks"}
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuItem
              key="all"
              className="flex cursor-pointer items-center space-x-2 capitalize text-primary"
              onClick={() => {
                handleFrameworkSelection(null);
                setDropdownOpen(false);
              }}
            >
              Reset Frameworks Filters
            </DropdownMenuItem>
            {Object.values(Framework).map((fw) => (
              <DropdownMenuCheckboxItem
                key={fw}
                checked={selectedFrameworks.includes(fw)}
                className="flex cursor-pointer items-center space-x-2 capitalize"
                onSelect={(e) => {
                  e.preventDefault();
                  handleFrameworkSelection(fw);
                  setDropdownOpen(false);
                }}
              >
                {FrameworkIcon(fw)}
                <span>{fw}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
          <Button
            onClick={async () => {
              await handleClearSearch();
              await handleFrameworkSelection(null);
              setDropdownOpen(false);
            }}
            className="mt-4 flex items-center gap-2"
          >
            <RefreshCcw className="size-4" />
            <span>Clear search</span>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-10 pb-5 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {showSkeleton
            ? // Loading skeleton
              [...Array(12)].map((_, i) => (
                <Skeleton key={i} className="h-[320px] w-full rounded-lg" />
              ))
            : // Popular
              [
                ...popularChats.map((chat) => (
                  <ComponentCard
                    key={`${chat.chat_id}-popular`}
                    chat={chat}
                    isPopular
                  />
                )),
                // Public (excluding duplicates)
                ...filteredPublicChats.map((chat) => (
                  <ComponentCard key={chat.chat_id} chat={chat} />
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
                <Loader2 className="size-4 animate-spin" />
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
