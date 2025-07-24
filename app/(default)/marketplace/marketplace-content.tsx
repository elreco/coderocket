"use client";

import {
  Search,
  Filter,
  Grid,
  List,
  DollarSign,
  Heart,
  ShoppingCart,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserWidget } from "@/components/user-widget";
import { avatarApi } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

import {
  MarketplaceCategory,
  MarketplaceListing,
  getMarketplaceListings,
} from "./actions";

interface MarketplaceContentProps {
  categories: MarketplaceCategory[];
  initialListings: MarketplaceListing[];
  selectedCategory: MarketplaceCategory | null;
  initialSearchQuery: string;
  initialSortBy: "recent" | "popular" | "price_low" | "price_high";
}

export function MarketplaceContent({
  categories,
  initialListings,
  selectedCategory,
  initialSearchQuery,
  initialSortBy,
}: MarketplaceContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] =
    useState<MarketplaceListing[]>(initialListings);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [sortBy, setSortBy] = useState<
    "recent" | "popular" | "price_low" | "price_high"
  >(initialSortBy);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const updateURL = (params: Record<string, string | undefined>) => {
    const newSearchParams = new URLSearchParams(searchParams);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }
    });

    router.push(`/marketplace?${newSearchParams.toString()}`);
  };

  const handleCategoryChange = (categorySlug: string | null) => {
    updateURL({
      category: categorySlug || undefined,
      search: searchQuery || undefined,
      sort: sortBy !== "recent" ? sortBy : undefined,
    });
  };

  const handleSearch = () => {
    updateURL({
      category: selectedCategory?.slug,
      search: searchQuery || undefined,
      sort: sortBy !== "recent" ? sortBy : undefined,
    });
  };

  const handleSortChange = (
    newSort: "recent" | "popular" | "price_low" | "price_high",
  ) => {
    setSortBy(newSort);
    updateURL({
      category: selectedCategory?.slug,
      search: searchQuery || undefined,
      sort: newSort !== "recent" ? newSort : undefined,
    });
  };

  const filteredListings = useMemo(() => {
    let filtered = [...listings];

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (listing) =>
          listing.title.toLowerCase().includes(query) ||
          listing.description.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [listings, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} variant="outline">
            Search
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="size-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!selectedCategory ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategoryChange(null)}
        >
          All Categories
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={
              selectedCategory?.id === category.id ? "default" : "outline"
            }
            size="sm"
            onClick={() => handleCategoryChange(category.slug)}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredListings.length} component
        {filteredListings.length !== 1 ? "s" : ""} found
      </div>

      {/* Listings Grid */}
      {viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => (
            <MarketplaceCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredListings.map((listing) => (
            <MarketplaceListItem key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {filteredListings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <Search className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No components found</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Try adjusting your search terms or browse different categories to
            find the perfect component.
          </p>
        </div>
      )}
    </div>
  );
}

function MarketplaceCard({ listing }: { listing: MarketplaceListing }) {
  return (
    <Card className="group transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge variant="secondary" className="text-xs">
            {listing.category.name}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {listing.chat.framework?.toUpperCase()}
          </Badge>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold leading-tight transition-colors group-hover:text-primary">
            {listing.title}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {listing.description}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center space-x-2">
          <Avatar className="size-6 border border-primary">
            <AvatarImage src={listing.seller.avatar_url || undefined} />
            <AvatarFallback>
              <img
                src={`${avatarApi}${listing.seller.full_name}`}
                alt="seller"
                className="size-full"
              />
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {listing.seller.full_name || "Anonymous"}
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {listing.total_sales > 0 && (
            <div className="flex items-center gap-1">
              <ShoppingCart className="size-3" />
              <span>{listing.total_sales}</span>
            </div>
          )}
          <span>{getRelativeDate(listing.created_at)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(listing.price_cents / 100)}
          </span>
          <Button size="sm" asChild>
            <Link href={`/marketplace/${listing.id}`}>View Details</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function MarketplaceListItem({ listing }: { listing: MarketplaceListing }) {
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {listing.category.name}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {listing.chat.framework?.toUpperCase()}
              </Badge>
            </div>

            <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">
              {listing.title}
            </h3>

            <p className="line-clamp-2 text-sm text-muted-foreground">
              {listing.description}
            </p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Avatar className="size-5 border border-primary">
                  <AvatarImage src={listing.seller.avatar_url || undefined} />
                  <AvatarFallback>
                    <img
                      src={`${avatarApi}${listing.seller.full_name}`}
                      alt="seller"
                      className="size-full"
                    />
                  </AvatarFallback>
                </Avatar>
                <span>{listing.seller.full_name || "Anonymous"}</span>
              </div>

              {listing.total_sales > 0 && (
                <div className="flex items-center gap-1">
                  <ShoppingCart className="size-3" />
                  <span>{listing.total_sales} sales</span>
                </div>
              )}

              <span>{getRelativeDate(listing.created_at)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(listing.price_cents / 100)}
            </span>
            <Button size="sm" asChild>
              <Link href={`/marketplace/${listing.id}`}>View Details</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
