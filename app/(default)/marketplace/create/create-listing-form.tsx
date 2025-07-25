"use client";

import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import {
  Plus,
  DollarSign,
  Tag,
  Loader2,
  Search,
  Grid,
  List,
  Edit,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { createClient } from "@/utils/supabase/client";

import {
  MarketplaceCategory,
  createMarketplaceListing,
  getUserPrivateComponentsPaginated,
  getComponentVersions,
} from "../actions";

interface CreateListingFormProps {
  categories: MarketplaceCategory[];
}

type Component = {
  id: string;
  title: string | null;
  slug: string | null;
  framework: string | null;
  created_at: string;
  latest_version: number;
  total_versions: number;
  screenshot?: string | null;
};

type ComponentVersion = {
  version: number;
  created_at: string;
};

export function CreateListingForm({ categories }: CreateListingFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // Component selection state
  const [components, setComponents] = useState<Component[]>([]);
  const [hasMoreComponents, setHasMoreComponents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isComponentSectionMinimized, setIsComponentSectionMinimized] =
    useState(false);

  // Selected component and versions
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(
    null,
  );
  const [componentVersions, setComponentVersions] = useState<
    ComponentVersion[]
  >([]);

  const [formData, setFormData] = useState({
    chatId: "",
    version: 0,
    categoryId: "",
    title: "",
    description: "",
    price: "",
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    async (query: string) => {
      setIsLoading(true);
      try {
        const result = await getUserPrivateComponentsPaginated({
          limit: 20,
          offset: 0,
          search: query,
        });
        setComponents(result.components);
        setHasMoreComponents(result.hasMore);
      } catch (error) {
        console.error("Error searching components:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to search components.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  // Load initial components
  const loadInitialComponents = async () => {
    setIsLoading(true);
    try {
      const result = await getUserPrivateComponentsPaginated({
        limit: 20,
        offset: 0,
        search: searchQuery,
      });
      setComponents(result.components);
      setHasMoreComponents(result.hasMore);
    } catch (error) {
      console.error("Error loading components:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load your components.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load more components (pagination)
  const loadMoreComponents = async () => {
    if (isLoadingMore || !hasMoreComponents) return;

    setIsLoadingMore(true);
    try {
      const result = await getUserPrivateComponentsPaginated({
        limit: 20,
        offset: components.length,
        search: searchQuery,
      });
      setComponents((prev) => [...prev, ...result.components]);
      setHasMoreComponents(result.hasMore);
    } catch (error) {
      console.error("Error loading more components:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load component versions
  const loadComponentVersions = async (chatId: string) => {
    setIsLoadingVersions(true);
    try {
      const versions = await getComponentVersions(chatId);
      setComponentVersions(versions);

      // Set the latest version as default
      if (versions.length > 0) {
        setFormData((prev) => ({
          ...prev,
          version: versions[0].version,
        }));
      }
    } catch (error) {
      console.error("Error loading component versions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load component versions.",
      });
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, debouncedSearch]);

  // Load components on mount
  useEffect(() => {
    loadInitialComponents();
  }, []);

  // Handle component selection
  const handleComponentSelect = async (component: Component) => {
    setSelectedComponent(component);
    setFormData((prev) => ({
      ...prev,
      chatId: component.id,
      title: component.title || "Untitled Component",
    }));

    // Load versions for this component
    await loadComponentVersions(component.id);

    // Minimize the component selection section and clear search
    setIsComponentSectionMinimized(true);
    setSearchQuery("");
  };

  // Handle version selection
  const handleVersionSelect = async (version: string) => {
    const versionNum = parseInt(version);
    setFormData((prev) => ({
      ...prev,
      version: versionNum,
    }));

    // Update the screenshot for the selected version
    if (selectedComponent) {
      try {
        const supabase = createClient();
        const { data: message } = await supabase
          .from("messages")
          .select("screenshot")
          .eq("chat_id", selectedComponent.id)
          .eq("version", versionNum)
          .eq("role", "assistant")
          .single();

        setSelectedComponent((prev) =>
          prev ? { ...prev, screenshot: message?.screenshot || null } : prev,
        );
      } catch (error) {
        console.error("Error fetching screenshot for version:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.chatId ||
      !formData.categoryId ||
      !formData.title ||
      !formData.description ||
      !formData.price
    ) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Price",
        description: "Please enter a valid price greater than $0.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createMarketplaceListing({
        chatId: formData.chatId,
        version: formData.version,
        categoryId: parseInt(formData.categoryId),
        title: formData.title,
        description: formData.description,
        priceCents: Math.round(price * 100),
      });

      if (result.success && result.listingId) {
        toast({
          title: "Success!",
          description: "Your component has been listed on the marketplace.",
        });
        router.push(`/marketplace/${result.listingId}`);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to create listing.",
        });
        // Allow user to change component if creation failed
        setIsComponentSectionMinimized(false);
      }
    } catch (error) {
      console.error("Error creating listing:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
      // Don't minimize section if there's an error, so user can change component
      setIsComponentSectionMinimized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCategory = categories.find(
    (c) => c.id.toString() === formData.categoryId,
  );

  return (
    <div className="w-full pb-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Component Selection Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Component</CardTitle>
                {!isComponentSectionMinimized && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a private component from your collection to list on
                    the marketplace.
                  </p>
                )}
              </div>
              {!isComponentSectionMinimized && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isComponentSectionMinimized && selectedComponent ? (
              /* Minimized View */
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-4">
                  {selectedComponent.screenshot && (
                    <div
                      className="size-12 shrink-0 rounded-md bg-muted bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${selectedComponent.screenshot})`,
                      }}
                    />
                  )}
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      {(() => {
                        const FrameworkIcon =
                          selectedComponent.framework === Framework.REACT
                            ? SiReact
                            : selectedComponent.framework === Framework.VUE
                              ? SiVuedotjs
                              : SiHtml5;

                        return (
                          <Badge className="hover:bg-primary">
                            <FrameworkIcon className="mr-1 size-3" />
                            <span className="first-letter:uppercase">
                              {selectedComponent.framework}
                            </span>
                          </Badge>
                        );
                      })()}
                      <h3 className="font-semibold">
                        {selectedComponent.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedComponent.total_versions} version
                      {selectedComponent.total_versions !== 1 ? "s" : ""} •
                      {getRelativeDate(selectedComponent.created_at)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsComponentSectionMinimized(false)}
                >
                  <Edit className="mr-1 size-3" />
                  Change Component
                </Button>
              </div>
            ) : (
              /* Expanded View */
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search your private components..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Components Grid/List */}
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="mr-2 size-6 animate-spin" />
                      <span>Loading your components...</span>
                    </div>
                  ) : components.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {searchQuery
                        ? "No components found matching your search."
                        : "No private components found. Create a private component first."}
                    </div>
                  ) : (
                    <>
                      <div
                        className={cn(
                          viewMode === "grid"
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            : "space-y-2",
                        )}
                      >
                        {components.map((component) => (
                          <ComponentCard
                            key={component.id}
                            component={component}
                            isSelected={selectedComponent?.id === component.id}
                            viewMode={viewMode}
                            onSelect={() => handleComponentSelect(component)}
                          />
                        ))}
                      </div>

                      {/* Load More Button */}
                      {hasMoreComponents && (
                        <div className="flex justify-center pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={loadMoreComponents}
                            disabled={isLoadingMore}
                          >
                            {isLoadingMore ? (
                              <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Loading more...
                              </>
                            ) : (
                              "Load more components"
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Selected Component & Listing Details */}
        {selectedComponent && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column: Component Details */}
            <Card>
              <CardHeader>
                <CardTitle>Component Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Component Info */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    {(() => {
                      const FrameworkIcon =
                        selectedComponent.framework === Framework.REACT
                          ? SiReact
                          : selectedComponent.framework === Framework.VUE
                            ? SiVuedotjs
                            : SiHtml5;

                      return (
                        <>
                          <Badge className="hover:bg-primary">
                            <FrameworkIcon className="mr-1 size-3" />
                            <span className="first-letter:uppercase">
                              {selectedComponent.framework}
                            </span>
                          </Badge>
                          <h3 className="font-semibold">
                            {selectedComponent.title}
                          </h3>
                        </>
                      );
                    })()}
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {selectedComponent.total_versions} version
                    {selectedComponent.total_versions !== 1 ? "s" : ""} •
                    Created {getRelativeDate(selectedComponent.created_at)}
                  </p>

                  {/* Component Preview */}
                  {selectedComponent.screenshot && (
                    <div className="mb-3">
                      <div
                        className="aspect-video w-full rounded-md bg-muted bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${selectedComponent.screenshot})`,
                        }}
                      />
                    </div>
                  )}

                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`/components/${selectedComponent.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Preview Component
                    </a>
                  </Button>
                </div>

                {/* Version Selection */}
                <div className="space-y-2">
                  <Label htmlFor="version">Version *</Label>
                  <Select
                    onValueChange={handleVersionSelect}
                    value={formData.version.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select version to list" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingVersions ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Loading versions...
                        </div>
                      ) : (
                        componentVersions.map((version) => (
                          <SelectItem
                            key={version.version}
                            value={version.version.toString()}
                          >
                            Version {version.version} (
                            {getRelativeDate(version.created_at)})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Listing Information */}
            <Card>
              <CardHeader>
                <CardTitle>Listing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, categoryId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id.toString()}
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="size-3" />
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Enter a compelling title for your component"
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe what your component does, its features, and how it can be used..."
                    rows={4}
                    maxLength={1000}
                  />
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="1"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum price is $1.00. You&apos;ll earn 70% of each sale.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Listing Summary */}
        {selectedComponent &&
          formData.title &&
          formData.price &&
          selectedCategory &&
          parseFloat(formData.price) > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Listing Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Component:</span>
                    <p className="font-medium">{formData.title}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="font-medium">{selectedCategory.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>
                    <p className="font-medium">${formData.price}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Your earnings per sale:
                    </span>
                    <p className="font-medium text-green-600">
                      ${(parseFloat(formData.price) * 0.7).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !selectedComponent}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating Listing...
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                Create Listing
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Component Card Component
function ComponentCard({
  component,
  isSelected,
  viewMode,
  onSelect,
}: {
  component: Component;
  isSelected: boolean;
  viewMode: "grid" | "list";
  onSelect: () => void;
}) {
  const FrameworkIcon =
    component.framework === Framework.REACT
      ? SiReact
      : component.framework === Framework.VUE
        ? SiVuedotjs
        : SiHtml5;

  if (viewMode === "list") {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full p-4 rounded-lg border text-left transition-all hover:border-primary/50",
          isSelected
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "border-border",
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className="size-16 shrink-0 rounded-md bg-muted bg-cover bg-center"
            style={{
              backgroundImage: component.screenshot
                ? `url(${component.screenshot})`
                : undefined,
            }}
          >
            {!component.screenshot && (
              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                No preview
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge className="hover:bg-primary">
                <FrameworkIcon className="mr-1 size-3" />
                <span className="first-letter:uppercase">
                  {component.framework}
                </span>
              </Badge>
              <h3 className="truncate font-medium">
                {component.title || "Untitled Component"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {component.total_versions} version
              {component.total_versions !== 1 ? "s" : ""} •
              {getRelativeDate(component.created_at)}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-lg border transition-all hover:border-primary/50",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border",
      )}
    >
      <div
        className="aspect-video w-full bg-muted bg-cover bg-center"
        style={{
          backgroundImage: component.screenshot
            ? `url(${component.screenshot})`
            : "url(/placeholder.svg)",
        }}
      >
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
            <div className="rounded-full bg-primary p-2 text-primary-foreground">
              <Plus className="size-4" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="mb-1 flex items-center gap-2">
          <Badge className="hover:bg-primary">
            <FrameworkIcon className="mr-1 size-3" />
            <span className="first-letter:uppercase">
              {component.framework}
            </span>
          </Badge>
        </div>
        <h3 className="line-clamp-2 text-left text-sm font-medium">
          {component.title || "Untitled Component"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {component.total_versions} version
          {component.total_versions !== 1 ? "s" : ""} •
          {getRelativeDate(component.created_at)}
        </p>
      </div>
    </button>
  );
}
