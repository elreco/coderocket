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
  const { canCreateListing, needsPremium, isLoading } = useStripeStatus();

  const handleClick = () => {
    // Don't navigate if still loading
    if (isLoading) {
      return;
    }

    setIsNavigating(true);

    // Navigate based on current status
    let href: string;
    if (canCreateListing) {
      href = "/marketplace/create";
    } else if (needsPremium) {
      href = "/pricing?reason=marketplace-create";
    } else {
      href = "/account/marketplace/stripe-onboarding";
    }

    router.push(href);
  };

  // Always show "Create Listing" by default, let the routing handle the specifics
  const text = children || customText?.create || "Create Listing";

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isNavigating || isLoading}
      {...props}
    >
      {showIcon && (
        <>
          {isNavigating || isLoading ? (
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
