"use client";

import { DollarSign, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { MarketplaceListing, updateMarketplaceListing } from "../../actions";

interface EditTemplateFormProps {
  template: MarketplaceListing;
}

export function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: template.title,
    description: template.description,
    price: (template.price_cents / 100).toFixed(2),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
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
      const result = await updateMarketplaceListing({
        listingId: template.id,
        title: formData.title,
        description: formData.description,
        priceCents: Math.round(price * 100),
      });

      if (result.success) {
        toast({
          title: "Success!",
          description: "Your template has been updated.",
        });
        router.push(`/templates/${template.id}`);
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to update listing.",
        });
      }
    } catch (error) {
      console.error("Error updating listing:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              maxLength={100}
              placeholder="Enter a compelling title for your component"
              disabled={isLoading}
            />
            <p className="text-muted-foreground text-xs">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              maxLength={1000}
              rows={4}
              placeholder="Describe what makes your component special..."
              disabled={isLoading}
            />
            <p className="text-muted-foreground text-xs">
              {formData.description.length}/1000 characters
            </p>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">
              Price (USD) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                max="999.99"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                className="pl-10"
                placeholder="9.99"
                disabled={isLoading}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Set a competitive price for your component (minimum $0.01)
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Template"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
