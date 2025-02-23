"use client";

import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

import ComponentCard from "@/components/component-card";
import { ComponentCardNew } from "@/components/component-card-new";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  type GetComponentsReturnType,
  getAllPublicChats,
  getAllPopularPublicChats,
} from "./actions";

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
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetcher pour les chats publics
  const fetcherPublic = async (key: string) => {
    const [, offset, search] = key.split("-");
    return await getAllPublicChats(PAGE_SIZE, Number(offset), search);
  };

  // Fetcher pour les populaires
  const fetcherPopular = async (search?: string) => {
    return await getAllPopularPublicChats(4, 0, search);
  };

  // Requête paginée pour les chats publics
  const {
    data,
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
      fallbackData: [initialChats],
    },
  );

  // Requête simple pour les populaires
  const {
    data: popularChats,
    isValidating: isValidatingPopular,
    mutate: mutatePopularChats,
  } = useSWR(
    `popular-${submittedSearch}`,
    () => fetcherPopular(submittedSearch),
    {
      fallbackData: initialPopularChats,
      revalidateOnFocus: false,
    },
  );

  const chats = useMemo(() => data?.flat() || [], [data]);
  const displayedPopularChats = useMemo(
    () => popularChats || [],
    [popularChats],
  );

  // ✅ Active `isLoading` uniquement si une recherche est en cours
  useEffect(() => {
    if (submittedSearch && (isValidatingPublic || isValidatingPopular)) {
      setIsLoading(true);
    } else {
      setTimeout(() => setIsLoading(false), 300);
    }
  }, [isValidatingPublic, isValidatingPopular, submittedSearch]);

  const handleSearchInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    [],
  );

  const handleSubmitSearch = useCallback(() => {
    if (!searchQuery.trim()) return; // Ne rien faire si le champ est vide
    setSubmittedSearch(searchQuery);
    setIsLoading(true);

    Promise.all([
      mutatePublicChats(undefined, { revalidate: true, populateCache: true }),
      mutatePopularChats(),
    ]);
  }, [searchQuery, mutatePublicChats, mutatePopularChats]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSubmittedSearch("");
    setIsLoading(false);

    Promise.all([
      mutatePublicChats(undefined, { revalidate: true, populateCache: true }),
      mutatePopularChats(),
    ]);
  }, [mutatePublicChats, mutatePopularChats]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSubmitSearch();
      }
    },
    [handleSubmitSearch],
  );

  // Infinite scroll handler
  const loadMore = useCallback(() => {
    if (size < MAX_PAGES && !isValidatingPublic) {
      setSize(size + 1);
    }
  }, [size, isValidatingPublic, setSize]);

  // Ajouter un écouteur de défilement
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

  return (
    <div>
      {/* Barre de recherche */}
      <div className="mb-6 flex items-center justify-start gap-2">
        <div className="relative flex w-full max-w-xl items-center rounded-md border border-border bg-secondary pl-3 focus-within:border-primary">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <Input
            id="search"
            placeholder="Search a component..."
            value={searchQuery}
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
              disabled={isLoading || isValidatingPublic || isValidatingPopular}
              className="ml-1"
            >
              {isLoading || isValidatingPublic || isValidatingPopular ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Liste des résultats */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-10 pb-20 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {/* ✅ Affichage du Skeleton UNIQUEMENT si `submittedSearch` n'est pas vide */}
        {isLoading && submittedSearch ? (
          [...Array(12)].map((_, index) => (
            <Skeleton key={index} className="h-[320px] w-full rounded-lg" />
          ))
        ) : (
          <>
            {displayedPopularChats.map((chat) => (
              <ComponentCardNew isPopular key={chat.chat_id} chat={chat} />
            ))}
            {/* Affichage des populaires */}
            {displayedPopularChats.map((chat) => (
              <ComponentCard isPopular key={chat.chat_id} chat={chat} />
            ))}

            {/* Affichage des résultats normaux */}
            {chats.map((chat) => (
              <ComponentCard key={chat!.chat_id} chat={chat!} />
            ))}

            {/* Afficher un indicateur de chargement lors du chargement de plus de données */}
            {isValidatingPublic &&
              [...Array(PAGE_SIZE)].map((_, index) => (
                <Skeleton
                  key={`loading-${index}`}
                  className="h-[320px] w-full rounded-lg"
                />
              ))}
          </>
        )}
      </div>
    </div>
  );
}
