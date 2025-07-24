"use client";

import { Plus, DollarSign, Tag, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import {
  MarketplaceCategory,
  createMarketplaceListing,
  getUserPrivateComponents,
} from "./actions";

interface ListingFormProps {
  categories: MarketplaceCategory[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ListingForm({
  categories,
  trigger,
  onSuccess,
}: ListingFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [components, setComponents] = useState<Awaited<
    ReturnType<typeof getUserPrivateComponents>
  > | null>(null);

  const [formData, setFormData] = useState({
    chatId: "",
    version: 0,
    categoryId: "",
    title: "",
    description: "",
    price: "",
  });

  const loadComponents = async () => {
    if (!components) {
      setIsLoading(true);
      try {
        const userComponents = await getUserPrivateComponents();
        setComponents(userComponents);
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your components.",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleComponentSelect = (chatId: string) => {
    const component = components?.find((c) => c.id === chatId);
    if (component) {
      setFormData((prev) => ({
        ...prev,
        chatId,
        version: component.versions[0]?.version || 0,
        title: component.title || "Untitled Component",
      }));
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

      if (result.success) {
        toast({
          title: "Success!",
          description: "Your component has been listed on the marketplace.",
        });
        setIsOpen(false);
        setFormData({
          chatId: "",
          version: 0,
          categoryId: "",
          title: "",
          description: "",
          price: "",
        });
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/account/marketplace/listings");
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create listing.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedComponent = components?.find((c) => c.id === formData.chatId);
  const selectedCategory = categories.find(
    (c) => c.id.toString() === formData.categoryId,
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button onClick={loadComponents}>
            <Plus className="mr-2 size-4" />
            List Component
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>List Component on Marketplace</DialogTitle>
          <DialogDescription>
            Share your private component with the community and earn money from
            sales. Only premium users can list components on the marketplace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Component Selection */}
          <div className="space-y-3">
            <Label htmlFor="component">Select Component *</Label>
            <Select
              value={formData.chatId}
              onValueChange={handleComponentSelect}
              onOpenChange={(open) => open && loadComponents()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a private component to list" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Loading components...
                  </div>
                ) : components?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No private components found. Create a private component
                    first.
                  </div>
                ) : (
                  components?.map((component) => (
                    <SelectItem key={component.id} value={component.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {component.framework?.toUpperCase()}
                        </Badge>
                        <span>{component.title || "Untitled Component"}</span>
                        <span className="text-xs text-muted-foreground">
                          ({component.versions.length} version
                          {component.versions.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedComponent && (
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedComponent.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Framework: {selectedComponent.framework?.toUpperCase()}{" "}
                        • Version: {formData.version} •
                        {selectedComponent.versions.length} total versions
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a
                        href={`/components/${selectedComponent.slug}`}
                        target="_blank"
                      >
                        Preview
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Version Selection */}
          {selectedComponent && selectedComponent.versions.length > 1 && (
            <div className="space-y-3">
              <Label htmlFor="version">Select Version *</Label>
              <Select
                value={formData.version.toString()}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, version: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedComponent.versions.map((version) => (
                    <SelectItem
                      key={version.version}
                      value={version.version.toString()}
                    >
                      Version {version.version} (Created{" "}
                      {new Date(version.created_at).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Category Selection */}
          <div className="space-y-3">
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
                  <SelectItem key={category.id} value={category.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Tag className="size-4" />
                      <div>
                        <div className="font-medium">{category.name}</div>
                        {category.description && (
                          <div className="text-xs text-muted-foreground">
                            {category.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter a compelling title for your component"
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">
              This will be the main title shown to potential buyers.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-3">
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
              placeholder="Describe your component, its features, and what makes it special..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/1000 characters. Be detailed about
              features and use cases.
            </p>
          </div>

          {/* Price */}
          <div className="space-y-3">
            <Label htmlFor="price">Price (USD) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                min="1"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="9.99"
                className="pl-10"
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm">
                <strong>Commission Structure:</strong>
              </p>
              <div className="mt-1 text-sm text-muted-foreground">
                {formData.price && !isNaN(parseFloat(formData.price)) && (
                  <>
                    • Platform fee (30%): $
                    {(parseFloat(formData.price) * 0.3).toFixed(2)}
                    <br />• Your earnings (70%): $
                    {(parseFloat(formData.price) * 0.7).toFixed(2)}
                  </>
                )}
                <br />• Minimum price: $1.00
              </div>
            </div>
          </div>

          {/* Summary */}
          {selectedComponent && selectedCategory && formData.price && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Listing Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Component:</span>
                  <span className="font-medium">{formData.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="font-medium">{selectedCategory.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="font-medium">${formData.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your earnings per sale:</span>
                  <span className="font-medium text-green-600">
                    ${(parseFloat(formData.price) * 0.7).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
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
      </DialogContent>
    </Dialog>
  );
}
