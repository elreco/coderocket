"use client";

import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
} from "@icons-pack/react-simple-icons";
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
import { useStripeStatus } from "@/hooks/use-stripe-status";
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

export function CreateTemplateForm({ categories }: CreateListingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const stripeStatus = useStripeStatus();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isSelectingComponent, setIsSelectingComponent] = useState<
    string | null
  >(null);

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

  // Load component versions
  const loadComponentVersions = useCallback(
    async (chatId: string) => {
      setIsLoadingVersions(true);
      try {
        const versions = await getComponentVersions(chatId);
        setComponentVersions(versions);

        // Set the latest version as default and update screenshot
        if (versions.length > 0) {
          const latestVersion = versions[0].version;
          setFormData((prev) => ({
            ...prev,
            version: latestVersion,
          }));

          // Update the screenshot for the latest version
          try {
            const supabase = createClient();
            const { data: message } = await supabase
              .from("messages")
              .select("screenshot")
              .eq("chat_id", chatId)
              .eq("version", latestVersion)
              .eq("role", "assistant")
              .single();

            setSelectedComponent((prev) =>
              prev
                ? { ...prev, screenshot: message?.screenshot || null }
                : prev,
            );
          } catch (error) {
            console.error(
              "Error fetching screenshot for default version:",
              error,
            );
          }
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
    },
    [toast],
  );

  // Handle component selection
  const handleComponentSelect = useCallback(
    async (component: Component) => {
      setIsSelectingComponent(component.id);
      try {
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
      } finally {
        setIsSelectingComponent(null);
      }
    },
    [loadComponentVersions],
  );

  // Check for restored form data from Stripe onboarding return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isStripeReturn = urlParams.get("stripe-return");

    if (isStripeReturn) {
      const savedData = localStorage.getItem("pendingListingData");
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setFormData({
            chatId: parsedData.chatId || "",
            version: parsedData.version || 0,
            categoryId: parsedData.categoryId || "",
            title: parsedData.title || "",
            description: parsedData.description || "",
            price: parsedData.price || "",
          });

          // If we have a selected component ID, try to restore it
          if (parsedData.selectedComponentId && components.length > 0) {
            const component = components.find(
              (c) => c.id === parsedData.selectedComponentId,
            );
            if (component) {
              // Restore the component selection asynchronously
              handleComponentSelect(component).catch(console.error);
            }
          }

          localStorage.removeItem("pendingListingData");
          toast({
            title: "Welcome back!",
            description:
              "Your Stripe account is now set up. You can complete your template.",
          });

          // Clean up URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("stripe-return");
          window.history.replaceState({}, "", newUrl.toString());
        } catch (error) {
          console.error("Failed to restore form data:", error);
          localStorage.removeItem("pendingListingData");
        }
      }
    }
  }, [components, toast, handleComponentSelect]);

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
  const loadInitialComponents = useCallback(async () => {
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
  }, [searchQuery, toast]);

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
  }, [loadInitialComponents]);

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
      !formData.description
    ) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    let price = 0;
    if (stripeStatus.onboardingComplete && formData.price) {
      price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        toast({
          variant: "destructive",
          title: "Invalid Price",
          description: "Please enter a valid price (use 0 for free templates).",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Only check Stripe account status for paid templates
      if (price > 0) {
        // Check Stripe account status before creating template
        const stripeResponse = await fetch(
          "/api/stripe-connect/account-status",
        );
        const stripeStatus = stripeResponse.ok
          ? await stripeResponse.json()
          : { hasAccount: false, onboardingComplete: false };

        // If no Stripe account, create one and redirect to onboarding
        if (!stripeStatus.hasAccount) {
          toast({
            title: "Setting up payments",
            description:
              "We'll help you set up your Stripe account to receive payments.",
          });

          const createAccountResponse = await fetch(
            "/api/stripe-connect/create-account",
            {
              method: "POST",
            },
          );

          const createAccountData = await createAccountResponse.json();

          if (!createAccountResponse.ok) {
            throw new Error(
              createAccountData.error || "Failed to create Stripe account",
            );
          }

          // Save form data in localStorage for restoration
          localStorage.setItem(
            "pendingListingData",
            JSON.stringify({
              ...formData,
              selectedComponentId: selectedComponent?.id,
            }),
          );

          // Redirect to Stripe onboarding with return URL
          const returnUrl = encodeURIComponent(
            `${window.location.origin}/templates/create?stripe-return=true`,
          );
          window.location.href = createAccountData.onboardingUrl.replace(
            "stripe-onboarding?success=true",
            `stripe-onboarding?success=true&return=${returnUrl}`,
          );
          return;
        }

        // If account exists but onboarding not complete
        if (stripeStatus.hasAccount && !stripeStatus.onboardingComplete) {
          toast({
            title: "Complete setup required",
            description:
              "Please complete your Stripe account setup to start selling.",
          });

          // Save form data in localStorage for restoration
          localStorage.setItem(
            "pendingListingData",
            JSON.stringify({
              ...formData,
              selectedComponentId: selectedComponent?.id,
            }),
          );

          // Redirect to complete onboarding
          const returnUrl = encodeURIComponent(
            `${window.location.origin}/templates/create?stripe-return=true`,
          );
          router.push(
            `/account/templates/stripe-onboarding?return=${returnUrl}`,
          );
          return;
        }
      }

      // Create the template (Stripe account is ready for paid templates, or not needed for free templates)
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
          description: `Your ${price > 0 ? "paid" : "free"} template has been listed successfully.`,
        });
        router.push(`/templates/${result.listingId}`);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to create template.",
        });
        setIsComponentSectionMinimized(false);
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
      });
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
                  <p className="text-muted-foreground mt-1 text-sm">
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
              <div className="bg-muted/50 flex items-center justify-between rounded-lg p-4">
                <div className="flex items-center gap-4">
                  {selectedComponent.screenshot && (
                    <div
                      className="bg-muted size-12 shrink-0 rounded-md bg-cover bg-center"
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
                              : selectedComponent.framework === Framework.SVELTE
                                ? SiSvelte
                                : selectedComponent.framework ===
                                    Framework.ANGULAR
                                  ? SiAngular
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
                    <p className="text-muted-foreground text-xs">
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
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
                    <div className="text-muted-foreground p-8 text-center">
                      {searchQuery
                        ? "No components found matching your search."
                        : "No private components found. Create a private component first."}
                    </div>
                  ) : (
                    <>
                      <div
                        className={cn(
                          viewMode === "grid"
                            ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                            : "space-y-2",
                        )}
                      >
                        {components.map((component) => (
                          <ComponentCard
                            key={component.id}
                            component={component}
                            isSelected={selectedComponent?.id === component.id}
                            isSelecting={isSelectingComponent === component.id}
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

        {/* Selected Component & Template Details */}
        {selectedComponent && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column: Component Details */}
            <Card>
              <CardHeader>
                <CardTitle>Component Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Component Info */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="mb-3 flex items-center gap-3">
                    {(() => {
                      const FrameworkIcon =
                        selectedComponent.framework === Framework.REACT
                          ? SiReact
                          : selectedComponent.framework === Framework.VUE
                            ? SiVuedotjs
                            : selectedComponent.framework === Framework.SVELTE
                              ? SiSvelte
                              : selectedComponent.framework ===
                                  Framework.ANGULAR
                                ? SiAngular
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
                  <p className="text-muted-foreground mb-3 text-sm">
                    {selectedComponent.total_versions} version
                    {selectedComponent.total_versions !== 1 ? "s" : ""} •
                    Created {getRelativeDate(selectedComponent.created_at)}
                  </p>

                  {/* Component Preview */}
                  {selectedComponent.screenshot && (
                    <div className="mb-3">
                      <div
                        className="bg-muted aspect-video w-full rounded-md bg-cover bg-center"
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
                  {isLoadingVersions ? (
                    <div className="flex items-center justify-center rounded-md border p-4">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Loading versions...
                    </div>
                  ) : componentVersions.length > 0 ? (
                    <Select
                      key={`${selectedComponent.id}-${formData.version}`} // Force re-render when component or version changes
                      onValueChange={handleVersionSelect}
                      value={formData.version.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select version to list" />
                      </SelectTrigger>
                      <SelectContent>
                        {componentVersions.map((version) => (
                          <SelectItem
                            key={version.version}
                            value={version.version.toString()}
                          >
                            Version {version.version} (
                            {getRelativeDate(version.created_at)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-muted-foreground flex items-center justify-center rounded-md border p-4">
                      No versions available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Template Information */}
            <Card>
              <CardHeader>
                <CardTitle>Template Information</CardTitle>
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
                <div className="space-y-3">
                  <Label htmlFor="price">
                    Price (USD){" "}
                    {!stripeStatus.onboardingComplete ? "(Free only)" : "*"}
                  </Label>
                  <div className="relative">
                    <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="pl-9"
                      disabled={!stripeStatus.onboardingComplete}
                      readOnly={!stripeStatus.onboardingComplete}
                    />
                  </div>

                  {/* Pricing explanation */}
                  {!stripeStatus.onboardingComplete ? (
                    <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-xs dark:border-blue-700 dark:bg-blue-900/20">
                      <div className="mb-2 font-medium text-blue-900 dark:text-blue-200">
                        ✅ You Can Create Free Templates
                      </div>
                      <div className="space-y-1 text-blue-800 dark:text-blue-300">
                        <div>
                          <strong>No subscription required!</strong> You can
                          create and share free templates ($0.00) with the
                          community right now.
                        </div>
                        <div className="mt-2">
                          💰 To create paid templates and earn 70% per use, you
                          need to:
                        </div>
                        <ul className="ml-4 list-disc">
                          <li>Have a Premium subscription</li>
                          <li>Complete Stripe Connect onboarding</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-lg border p-3 text-xs">
                      <div className="mb-2 font-medium">
                        Template Pricing Options:
                      </div>
                      <div className="text-muted-foreground space-y-1">
                        <div>
                          • <strong>$0.00 - Free Template:</strong> Share your
                          component with the community. No Stripe account
                          needed.
                        </div>
                        <div>
                          • <strong>$1.00+ - Premium Template:</strong> Earn 70%
                          per use. Requires Premium subscription and Stripe
                          setup.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Template Summary */}
        {selectedComponent &&
          formData.title &&
          formData.price &&
          selectedCategory &&
          parseFloat(formData.price) >= 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Template Summary</CardTitle>
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
                    <p className="font-medium">
                      {parseFloat(formData.price) === 0
                        ? "Free"
                        : `$${formData.price}`}
                    </p>
                  </div>
                  {parseFloat(formData.price) > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        Your earnings per use:
                      </span>
                      <p className="font-medium text-green-600">
                        ${(parseFloat(formData.price) * 0.7).toFixed(2)}
                      </p>
                    </div>
                  )}
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
                Processing...
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                Create Template
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
  isSelecting,
  viewMode,
  onSelect,
}: {
  component: Component;
  isSelected: boolean;
  isSelecting: boolean;
  viewMode: "grid" | "list";
  onSelect: () => void;
}) {
  const FrameworkIcon =
    component.framework === Framework.REACT
      ? SiReact
      : component.framework === Framework.VUE
        ? SiVuedotjs
        : component.framework === Framework.SVELTE
          ? SiSvelte
          : component.framework === Framework.ANGULAR
            ? SiAngular
            : SiHtml5;

  if (viewMode === "list") {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={isSelecting}
        className={cn(
          "cursor-pointer hover:border-primary w-full rounded-lg border-2 p-4 text-left transition-all duration-300",
          isSelected
            ? "border-primary bg-primary/5 ring-primary/20 ring-2"
            : "border-primary/20",
          isSelecting && "cursor-wait opacity-60",
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className="bg-muted relative size-16 shrink-0 rounded-md bg-cover bg-center"
            style={{
              backgroundImage: component.screenshot
                ? `url(${component.screenshot})`
                : undefined,
            }}
          >
            {isSelecting && (
              <div className="bg-background/80 absolute inset-0 flex items-center justify-center">
                <Loader2 className="text-primary size-6 animate-spin" />
              </div>
            )}
            {!component.screenshot && !isSelecting && (
              <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
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
            <p className="text-muted-foreground text-sm">
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
      disabled={isSelecting}
      className={cn(
        "group cursor-pointer hover:border-primary bg-secondary relative overflow-hidden rounded-lg border-2 transition-all duration-300",
        isSelected
          ? "border-primary ring-primary/20 ring-2"
          : "border-primary/20",
        isSelecting && "cursor-wait opacity-60",
      )}
    >
      <div
        className="bg-muted aspect-video w-full bg-cover bg-center"
        style={{
          backgroundImage: component.screenshot
            ? `url(${component.screenshot})`
            : "url(/placeholder.svg)",
        }}
      >
        {/* Selection indicator or loading spinner */}
        {isSelecting ? (
          <div className="bg-background/80 absolute inset-0 flex items-center justify-center">
            <Loader2 className="text-primary size-8 animate-spin" />
          </div>
        ) : isSelected ? (
          <div className="bg-primary/10 absolute inset-0 flex items-center justify-center">
            <div className="bg-primary text-primary-foreground rounded-full p-2">
              <Plus className="size-4" />
            </div>
          </div>
        ) : null}
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
        <p className="text-muted-foreground mt-1 text-xs">
          {component.total_versions} version
          {component.total_versions !== 1 ? "s" : ""} •
          {getRelativeDate(component.created_at)}
        </p>
      </div>
    </button>
  );
}
