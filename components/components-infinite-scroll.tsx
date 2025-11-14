"use client";

import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
} from "@icons-pack/react-simple-icons";
import {
  ArrowDown,
  ChevronDown,
  Loader,
  RefreshCcw,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  type GetComponentsReturnType,
  getAllPublicChats,
} from "@/app/(default)/components/actions";
import { ComponentCard } from "@/components/component-card";
import { ComponentsSlider } from "@/components/components-slider";
import { FrameworkCategoriesSlider } from "@/components/framework-categories-slider";
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

const PAGE_SIZE = 16;
const MAX_PAGE = 40;

interface ComponentsInfiniteScrollProps {
  initialChats: GetComponentsReturnType[] | null;
  initialSearchQuery?: string;
  initialSelectedFrameworks?: Framework[];
  initialSort?: "newest" | "top";
  isAccountPage?: boolean;
  isLikedPage?: boolean;
  reactComponents?: GetComponentsReturnType[];
  vueComponents?: GetComponentsReturnType[];
  htmlComponents?: GetComponentsReturnType[];
  svelteComponents?: GetComponentsReturnType[];
  angularComponents?: GetComponentsReturnType[];
  mostPopularComponents?: GetComponentsReturnType[];
}

export function ComponentsInfiniteScroll({
  initialChats,
  initialSearchQuery = "",
  initialSelectedFrameworks = [],
  initialSort = "newest",
  isAccountPage = false,
  isLikedPage = false,
  reactComponents = [],
  vueComponents = [],
  htmlComponents = [],
  svelteComponents = [],
  angularComponents = [],
  mostPopularComponents = [],
}: ComponentsInfiniteScrollProps) {
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [selectedFrameworks, setSelectedFrameworks] = useState<Framework[]>(
    initialSelectedFrameworks,
  );

  const [publicChats, setPublicChats] = useState<GetComponentsReturnType[]>(
    initialChats ?? [],
  );

  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(
    (initialChats?.length ?? 0) === PAGE_SIZE,
  );

  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [sortBy, setSortBy] = useState<"newest" | "top">(initialSort);

  function updateURLQuery(
    query: string,
    frameworks?: Framework[],
    sort?: "newest" | "top",
  ) {
    const params = new URLSearchParams();

    if (query && query.trim()) {
      params.set("search", query);
    }

    if (frameworks && frameworks.length > 0) {
      params.set("frameworks", frameworks.join(","));
    }

    if (sort && sort !== "newest") {
      params.set("sort", sort);
    }

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? `?${queryString}` : ""}`;

    window.history.replaceState(null, "", newUrl);
  }

  async function doFetchPublicChats({
    pageToFetch,
    search = "",
    frameworks = [],
    reset = false,
    sortByTop = false,
  }: {
    pageToFetch: number;
    search?: string;
    frameworks?: Framework[];
    reset?: boolean;
    sortByTop?: boolean;
  }) {
    try {
      if (isAccountPage ? pageToFetch >= 500 : pageToFetch >= MAX_PAGE) {
        setHasMore(false);
        return;
      }
      setIsFetchingMore(true);
      const data = await getAllPublicChats(
        PAGE_SIZE,
        pageToFetch * PAGE_SIZE,
        sortByTop,
        search,
        frameworks,
        isAccountPage,
        isLikedPage,
      );
      const validData = data.filter(Boolean);

      if (reset) {
        setPublicChats(validData);
        setPage(pageToFetch);
      } else {
        setPublicChats((prev) => [...prev, ...validData]);
        setPage(pageToFetch);
      }

      setHasMore(validData.length === PAGE_SIZE);
    } finally {
      setIsFetchingMore(false);
    }
  }

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

    updateURLQuery(searchQuery, selectedFrameworks, sortBy);

    await doFetchPublicChats({
      pageToFetch: 0,
      search: searchQuery,
      frameworks: selectedFrameworks,
      reset: true,
      sortByTop: sortBy === "top",
    });

    setIsLoading(false);
    setTimeout(() => setShowSkeleton(false), 300);
  }

  async function handleClearSearch() {
    setSearchQuery("");
    setIsLoading(true);
    setShowSkeleton(true);

    updateURLQuery("", selectedFrameworks, sortBy);

    await doFetchPublicChats({
      pageToFetch: 0,
      search: "",
      frameworks: selectedFrameworks,
      reset: true,
      sortByTop: sortBy === "top",
    });

    setIsLoading(false);
    setTimeout(() => setShowSkeleton(false), 300);
  }

  async function handleFrameworkSelection(framework: Framework | null) {
    setIsLoading(true);
    setShowSkeleton(true);

    let newFrameworks: Framework[] = [];

    if (!framework) {
      newFrameworks = [];
    } else {
      if (selectedFrameworks.includes(framework)) {
        newFrameworks = selectedFrameworks.filter((f) => f !== framework);
      } else {
        newFrameworks = [...selectedFrameworks, framework];
      }
    }

    setSelectedFrameworks(newFrameworks);
    updateURLQuery(searchQuery, newFrameworks, sortBy);

    await doFetchPublicChats({
      pageToFetch: 0,
      search: searchQuery,
      frameworks: newFrameworks,
      reset: true,
      sortByTop: sortBy === "top",
    });

    setIsLoading(false);
    setTimeout(() => setShowSkeleton(false), 300);
  }

  const loadMore = async () => {
    if (!hasMore || isFetchingMore) return;
    await doFetchPublicChats({
      pageToFetch: page + 1,
      search: searchQuery,
      frameworks: selectedFrameworks,
      sortByTop: sortBy === "top",
    });
  };

  const handleSortChange = async (newSort: "newest" | "top") => {
    setSortBy(newSort);
    setIsLoading(true);
    setShowSkeleton(true);

    updateURLQuery(searchQuery, selectedFrameworks, newSort);

    await doFetchPublicChats({
      pageToFetch: 0,
      search: searchQuery,
      frameworks: selectedFrameworks,
      reset: true,
      sortByTop: newSort === "top",
    });

    setIsLoading(false);
    setTimeout(() => setShowSkeleton(false), 300);
  };

  function FrameworkIcon(fw: Framework) {
    switch (fw) {
      case "react":
        return <SiReact className="size-4" />;
      case "html":
        return <SiHtml5 className="size-4" />;
      case "vue":
        return <SiVuedotjs className="size-4" />;
      case "svelte":
        return <SiSvelte className="size-4" />;
      case "angular":
        return <SiAngular className="size-4" />;
      default:
        return null;
    }
  }

  const hasNoResults = !showSkeleton && publicChats.length === 0;

  const showBrowseLayout =
    !isAccountPage &&
    !isLikedPage &&
    !searchQuery &&
    selectedFrameworks.length === 0;

  const handleFrameworkCardClick = async (framework: Framework) => {
    setIsLoading(true);
    setShowSkeleton(true);
    setSelectedFrameworks([framework]);
    updateURLQuery(searchQuery, [framework], sortBy);

    await doFetchPublicChats({
      pageToFetch: 0,
      search: searchQuery,
      frameworks: [framework],
      reset: true,
      sortByTop: sortBy === "top",
    });

    setIsLoading(false);
    setTimeout(() => setShowSkeleton(false), 300);
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="mb-14 flex w-full flex-col items-center justify-center gap-4">
        <div className="relative flex w-full max-w-2xl items-center rounded-md border border-border bg-secondary pl-3 focus-within:border-primary">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <Input
            id="search"
            placeholder="Search..."
            value={searchQuery}
            maxLength={MAX_SEARCH_LENGTH}
            onKeyDown={handleKeyDown}
            onChange={handleSearchInput}
            className="flex w-full rounded-md border-none bg-transparent py-3 text-sm font-normal outline-none placeholder:text-muted-foreground focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClearSearch();
              }}
              type="button"
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
      </div>

      {showBrowseLayout ? (
        <div className="w-full overflow-hidden">
          <h2 className="mb-2 text-sm font-semibold">Frameworks</h2>
          <FrameworkCategoriesSlider
            categories={
              [
                reactComponents && reactComponents.length > 0
                  ? { framework: Framework.REACT, components: reactComponents }
                  : null,
                vueComponents && vueComponents.length > 0
                  ? { framework: Framework.VUE, components: vueComponents }
                  : null,
                htmlComponents && htmlComponents.length > 0
                  ? { framework: Framework.HTML, components: htmlComponents }
                  : null,
                svelteComponents && svelteComponents.length > 0
                  ? {
                      framework: Framework.SVELTE,
                      components: svelteComponents,
                    }
                  : null,
                angularComponents && angularComponents.length > 0
                  ? {
                      framework: Framework.ANGULAR,
                      components: angularComponents,
                    }
                  : null,
              ].filter(Boolean) as {
                framework: Framework;
                components: GetComponentsReturnType[];
              }[]
            }
            onCategoryClick={handleFrameworkCardClick}
          />

          {mostPopularComponents && mostPopularComponents.length > 0 && (
            <div className="mb-3 w-full">
              <h2 className="mb-2 text-sm font-semibold">
                Most Popular Components
              </h2>
              <ComponentsSlider components={mostPopularComponents} />
            </div>
          )}

          <div className="w-full">
            <div className="mb-6 flex items-center justify-end border-t border-border py-4">
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border bg-secondary p-1">
                  <button
                    onClick={() => handleSortChange("newest")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      sortBy === "newest"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => handleSortChange("top")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      sortBy === "top"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Top
                  </button>
                </div>
              </div>
            </div>
            {publicChats.length === 0 && !showSkeleton ? (
              <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary px-4 py-6 text-center">
                <SearchX className="size-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  No components found
                </h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  No components available at the moment.
                </p>
              </div>
            ) : (
              <>
                <div className="grid w-full grid-cols-1 gap-4 pb-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {showSkeleton
                    ? [...Array(12)].map((_, i) => (
                        <Skeleton
                          key={i}
                          className="h-[220px] w-full rounded-lg"
                        />
                      ))
                    : publicChats.map((chat) => (
                        <ComponentCard key={chat.chat_id} chat={chat} />
                      ))}
                </div>
                {hasMore && !showSkeleton && (
                  <div className="flex w-full justify-center py-4">
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
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col items-center justify-start gap-2 space-y-2 sm:flex-row sm:space-y-0">
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

            {(selectedFrameworks.length > 0 || searchQuery) && (
              <Button
                size="lg"
                variant="secondary"
                className="flex w-full items-center gap-2 border border-border p-[22px] sm:w-auto"
                onClick={async () => {
                  setSearchQuery("");
                  setSelectedFrameworks([]);
                  setSortBy("newest");
                  updateURLQuery("", [], "newest");
                  setIsLoading(true);
                  setShowSkeleton(true);
                  await doFetchPublicChats({
                    pageToFetch: 0,
                    search: "",
                    frameworks: [],
                    reset: true,
                    sortByTop: false,
                  });
                  setIsLoading(false);
                  setTimeout(() => setShowSkeleton(false), 300);
                }}
              >
                <RefreshCcw className="size-4" />
                Reset Filters
              </Button>
            )}
          </div>

          {hasNoResults ? (
            <div className="mt-6 flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary px-4 py-6 text-center">
              <SearchX className="size-12 text-muted-foreground" />
              {isLikedPage ? (
                <h3 className="mt-4 text-lg font-semibold">
                  No liked components found
                </h3>
              ) : (
                <h3 className="mt-4 text-lg font-semibold">
                  No components found
                </h3>
              )}
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {isLikedPage
                  ? `No liked components found. Try changing your filters or search for something else.`
                  : searchQuery
                    ? `No results found for "${searchQuery}". Try adjusting your search or filters.`
                    : "No components available. Try changing your filters or search for something else."}
              </p>
              <Button
                onClick={async () => {
                  setSearchQuery("");
                  setSelectedFrameworks([]);
                  setSortBy("newest");
                  setIsLoading(true);
                  setShowSkeleton(true);

                  updateURLQuery("", [], "newest");

                  await doFetchPublicChats({
                    pageToFetch: 0,
                    search: "",
                    frameworks: [],
                    reset: true,
                    sortByTop: false,
                  });

                  setIsLoading(false);
                  setTimeout(() => setShowSkeleton(false), 300);
                  setDropdownOpen(false);
                }}
                className="mt-4 flex items-center gap-2"
              >
                <RefreshCcw className="size-4" />
                <span>Clear search</span>
              </Button>
            </div>
          ) : (
            <>
              <div className="my-6 flex items-center justify-end border-t border-border py-4">
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-border bg-secondary p-1">
                    <button
                      onClick={() => handleSortChange("newest")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        sortBy === "newest"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Newest
                    </button>
                    <button
                      onClick={() => handleSortChange("top")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        sortBy === "top"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Top
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 pb-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {showSkeleton
                  ? [...Array(12)].map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-[220px] w-full rounded-lg"
                      />
                    ))
                  : publicChats.map((chat) => (
                      <ComponentCard key={chat.chat_id} chat={chat} />
                    ))}
              </div>
            </>
          )}

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
        </>
      )}
    </div>
  );
}
