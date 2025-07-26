"use client";

import { Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

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
  const { canCreateListing, needsPremium, isLoading } = useStripeStatus();

  // Show loading state while checking Stripe status
  if (isLoading) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
        {...props}
      >
        {showIcon && <Loader2 className="mr-2 size-4 animate-spin" />}
        {children || "Loading..."}
      </Button>
    );
  }

  // Determine the correct href and content based on user status
  let href: string;
  let text: ReactNode;

  if (needsPremium) {
    href = "/pricing?reason=marketplace-create";
    text = children || customText?.upgradeToPremium || "Upgrade to Premium";
  } else if (canCreateListing) {
    href = "/marketplace/create";
    text = children || customText?.create || "Create New Listing";
  } else {
    href = "/account/marketplace/stripe-onboarding";
    text = children || customText?.becomeSeller || "Become a Seller";
  }

  const IconComponent = Plus; // Always use Plus icon for consistency

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      asChild
      {...props}
    >
      <Link href={href}>
        {showIcon && <IconComponent className="mr-2 size-4" />}
        {text}
      </Link>
    </Button>
  );
}
