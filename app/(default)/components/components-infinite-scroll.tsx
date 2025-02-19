"use client";

import { debounce } from "lodash";
import { Loader2, ArrowDown, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";

import ComponentCard from "@/components/component-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { type GetComponentsReturnType, getAllPublicChats } from "./actions";

const PAGE_SIZE = 17;
const MAX_PAGES = 12;

export default function ComponentsInfiniteScroll({
  initialChats,
  initialPopularChats,
}: {
  initialChats: GetComponentsReturnType[] | null;
  initialPopularChats: GetComponentsReturnType[] | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(false);

  const fetcher = async (key: string) => {
    const [, offset, search] = key.split("-");
    return await getAllPublicChats(PAGE_SIZE, Number(offset), search);
  };

  const { data, size, setSize, isValidating, mutate } = useSWRInfinite(
    (index) => `chats-${index * PAGE_SIZE}-${debouncedSearch}`,
    fetcher,
    {
      initialSize: 1,
      revalidateOnFocus: false,
      fallbackData: [initialChats],
    },
  );

  const chats = useMemo(() => {
    if (searchQuery !== debouncedSearch) return [];
    return data?.flat().filter(Boolean) || [];
  }, [data, searchQuery, debouncedSearch]);

  useEffect(() => {
    const handleScroll = () => {
      const isBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
      setIsAtBottom(isBottom);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isAtBottom && size < MAX_PAGES && !isValidating) {
      loadMore();
    }
  }, [isAtBottom, size, isValidating]);

  const loadMore = useCallback(() => {
    if (size < MAX_PAGES && !isValidating) {
      setSize(size + 1);
    }
  }, [size, setSize, isValidating]);

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    [],
  );

  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedSearch(searchQuery);
      mutate();
    }, 500);
    handler();
    return () => handler.cancel();
  }, [searchQuery, mutate]);

  return (
    <div>
      <div className="mb-6 flex justify-start">
        <div className="relative flex w-full max-w-md items-center rounded-md border border-border bg-secondary px-3 focus-within:border-primary">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <Input
            id="search"
            placeholder="Search a component..."
            value={searchQuery}
            onChange={handleSearch}
            className="flex h-10 w-full rounded-md border-none bg-transparent py-3 text-sm font-normal outline-none placeholder:text-muted-foreground focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-10 pb-20 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {!debouncedSearch &&
          initialPopularChats?.map((chat) => (
            <ComponentCard isPopular key={chat.chat_id} chat={chat} />
          ))}
        {isValidating &&
          chats.length === 0 &&
          [...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-lg" />
          ))}
        {chats.map((chat) => (
          <ComponentCard key={chat!.chat_id} chat={chat!} />
        ))}
        {size < MAX_PAGES && (
          <div className="col-span-full mt-6 flex justify-center">
            <Button
              onClick={loadMore}
              disabled={isValidating}
              variant="outline"
            >
              {isValidating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ArrowDown className="mr-2 size-4" />
              )}
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
