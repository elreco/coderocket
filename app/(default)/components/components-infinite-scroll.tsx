"use client";

import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

import ComponentCard from "@/components/component-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Framework, MAX_SEARCH_LENGTH } from "@/utils/config";

import {
  type GetComponentsReturnType,
  getAllPublicChats,
  getAllPopularPublicChats,
} from "./actions";

const PAGE_SIZE = 17;

interface ComponentsInfiniteScrollProps {
  initialChats: GetComponentsReturnType[] | null;
  initialPopularChats: GetComponentsReturnType[] | null;
  initialSearchQuery?: string;
  initialSelectedFrameworks?: Framework[];
}

export default function ComponentsInfiniteScroll({
  initialChats,
  initialPopularChats,
  initialSearchQuery = "",
  initialSelectedFrameworks = [],
}: ComponentsInfiniteScrollProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [submittedSearch, setSubmittedSearch] =
    useState<string>(initialSearchQuery);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const [selectedFrameworks, setSelectedFrameworks] = useState<Framework[]>(
    initialSelectedFrameworks,
  );
  const [searchParamsString, setSearchParamsString] = useState(
    searchParams.toString(),
  );

  const updateSearchQuery = useCallback(
    (query: string, frameworks?: Framework[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }
      if (frameworks.length > 0) {
        params.set("frameworks", frameworks.join(","));
      } else {
        params.delete("frameworks");
      }
      setSearchParamsString(params.toString());
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    router.replace(`${pathname}?${searchParamsString}`, { scroll: false });
  }, [searchParamsString, router, pathname]);

  const fetcherPublic = async (key: string) => {
    const [, offset, search] = key.split("-");
    return getAllPublicChats(
      PAGE_SIZE,
      Number(offset),
      search,
      selectedFrameworks,
    );
  };

  const fetcherPopular = async (search?: string) => {
    return getAllPopularPublicChats(4, 0, search, selectedFrameworks);
  };

  const {
    data: publicChatsPages,
    isValidating: isValidatingPublic,
    mutate: mutatePublicChats,
    size,
    setSize,
  } = useSWRInfinite(
    (index) => `chats-${index * PAGE_SIZE}-${submittedSearch}`,
    fetcherPublic,
    {
      initialSize: 1,
      revalidateOnFocus: false,
      fallbackData: [initialChats ?? []],
    },
  );

  const {
    data: popularChatsData,
    isValidating: isValidatingPopular,
    mutate: mutatePopularChats,
  } = useSWR(
    `popular-${submittedSearch}`,
    () => fetcherPopular(submittedSearch),
    {
      fallbackData: initialPopularChats ?? [],
      revalidateOnFocus: false,
    },
  );

  // ✅ Assurer que les résultats sont des tableaux valides et filtrer les valeurs null
  const publicChats = (publicChatsPages?.flat() ?? []).filter(Boolean);
  const popularChats = (popularChatsData ?? []).filter(Boolean);

  const filteredPublicChats = publicChats.filter(
    (chat) =>
      !popularChats.some((popularChat) => popularChat.chat_id === chat.chat_id),
  );

  const hasMore =
    publicChatsPages &&
    publicChatsPages[publicChatsPages.length - 1]?.length === PAGE_SIZE;

  useEffect(() => {
    if (submittedSearch && (isValidatingPublic || isValidatingPopular)) {
      setIsLoading(true);
      setShowSkeleton(true);
    } else {
      setTimeout(() => {
        setIsLoading(false);
        setShowSkeleton(false);
      }, 300);
    }
  }, [isValidatingPublic, isValidatingPopular, submittedSearch]);

  const handleSearchInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.slice(0, MAX_SEARCH_LENGTH);
      setSearchQuery(value);
    },
    [],
  );

  const handleSubmitSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    setSubmittedSearch(searchQuery);
    setIsLoading(true);
    setShowSkeleton(true);
    updateSearchQuery(searchQuery, selectedFrameworks);

    Promise.all([
      mutatePublicChats(undefined, { revalidate: true, populateCache: true }),
      mutatePopularChats(),
    ]);
  }, [searchQuery, mutatePublicChats, mutatePopularChats, updateSearchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSubmittedSearch("");
    setIsLoading(false);
    setShowSkeleton(false);
    updateSearchQuery("");

    Promise.all([
      mutatePublicChats(undefined, { revalidate: true, populateCache: true }),
      mutatePopularChats(),
    ]);
  }, [mutatePublicChats, mutatePopularChats, updateSearchQuery]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSubmitSearch();
      }
    },
    [handleSubmitSearch],
  );

  const loadMore = useCallback(() => {
    if (hasMore && !isValidatingPublic) {
      setSize(size + 1);
    }
  }, [size, isValidatingPublic, setSize, hasMore]);

  const handleFrameworkSelection = useCallback(
    (framework: Framework | null) => {
      setIsLoading(true);
      setShowSkeleton(true);

      setSelectedFrameworks((prev) => {
        const newFrameworks = framework
          ? prev.includes(framework)
            ? prev.filter((f) => f !== framework)
            : [...prev, framework]
          : [];

        updateSearchQuery(submittedSearch, newFrameworks);

        return newFrameworks;
      });
    },
    [submittedSearch, updateSearchQuery],
  );

  useEffect(() => {
    if (selectedFrameworks) {
      Promise.all([
        mutatePublicChats(undefined, { revalidate: true, populateCache: true }),
        mutatePopularChats(),
      ]);
    }
  }, [selectedFrameworks, mutatePublicChats, mutatePopularChats]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  const FrameworkIcon = (framework: Framework) => {
    switch (framework) {
      case "react":
        return <SiReact className="size-4" />;
      case "html":
        return <SiHtml5 className="size-4" />;
      case "vue":
        return <SiVuedotjs className="size-4" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-start gap-2">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-2 flex items-center">
              Filter <ChevronDown className="ml-1 size-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuItem
              key="all"
              className="flex cursor-pointer items-center space-x-2 bg-primary/50 capitalize text-primary"
              onClick={() => handleFrameworkSelection(null)}
            >
              Reset Frameworks Filters
            </DropdownMenuItem>
            {Object.values(Framework).map((framework) => (
              <DropdownMenuCheckboxItem
                key={framework}
                checked={selectedFrameworks.includes(framework)}
                className="flex cursor-pointer items-center space-x-2 capitalize"
                onCheckedChange={() => handleFrameworkSelection(framework)}
              >
                {FrameworkIcon(framework)}
                <span>{framework}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Liste des résultats avec gestion des valeurs null */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-10 pb-20 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {showSkeleton
          ? [...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-[320px] w-full rounded-lg" />
            ))
          : [
              ...popularChats.map((chat) => (
                <ComponentCard
                  key={`${chat.chat_id}-popular`}
                  chat={chat}
                  isPopular
                />
              )),
              ...filteredPublicChats.map((chat) => (
                <ComponentCard key={chat.chat_id} chat={chat} />
              )),
            ]}
      </div>
    </div>
  );
}
