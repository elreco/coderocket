"use client";

import { ExternalLink, Settings } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface StripeDashboardButtonProps {
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
  icon?: "settings" | "external" | "none";
  asLink?: boolean;
}

export function StripeDashboardButton({
  children = "Stripe Dashboard",
  variant = "outline",
  size = "default",
  className = "",
  icon = "settings",
  asLink = true,
  ...props
}: StripeDashboardButtonProps) {
  const IconComponent =
    icon === "settings" ? Settings : icon === "external" ? ExternalLink : null;

  if (asLink) {
    return (
      <Button
        asChild
        variant={variant}
        size={size}
        className={className}
        {...props}
      >
        <Link
          href="/account/templates/stripe-onboarding"
          className="flex items-center gap-2"
        >
          {IconComponent && <IconComponent className="size-4" />}
          <span>{children}</span>
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      asChild
      {...props}
    >
      <Link href="/account/templates/stripe-onboarding">
        {IconComponent && <IconComponent className="mr-2 size-4" />}
        {children}
      </Link>
    </Button>
  );
}
