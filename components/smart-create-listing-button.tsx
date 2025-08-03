"use client";

import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { useStripeStatus } from "@/hooks/use-stripe-status";

interface SmartCreateListingButtonProps {
  children?: ReactNode;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
  customText?: {
    create?: string;
    becomeSeller?: string;
    upgradeToPremium?: string;
  };
}

export function SmartCreateListingButton({
  children,
  variant = "default",
  size = "default",
  className = "",
  showIcon = true,
  customText,
  ...props
}: SmartCreateListingButtonProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const { canCreateListing, needsPremium, isLoading, refresh } =
    useStripeStatus();

  const handleClick = async () => {
    setIsNavigating(true);

    // If we have cached data, use it immediately
    if (!isLoading && (canCreateListing || needsPremium)) {
      let href: string;
      if (needsPremium) {
        href = "/pricing?reason=marketplace-create";
      } else if (canCreateListing) {
        href = "/marketplace/create";
      } else {
        href = "/account/marketplace/stripe-onboarding";
      }
      router.push(href);
      return;
    }

    // If no cached data, refresh in background and go to default page
    refresh().catch(() => {
      // Ignore errors, user will still get to create page
    });

    // Always go to create page - if user doesn't have permission,
    // the create page will handle redirecting them appropriately
    router.push("/marketplace/create");
  };

  // Always show "Create Listing" by default, let the routing handle the specifics
  const text = children || customText?.create || "Create Listing";

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isNavigating}
      {...props}
    >
      {showIcon && (
        <>
          {isNavigating ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Plus className="mr-2 size-4" />
          )}
        </>
      )}
      {text}
    </Button>
  );
}
