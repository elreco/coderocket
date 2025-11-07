"use client";

import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { useStripeStatus } from "@/hooks/use-stripe-status";

interface SmartCreateTemplateButtonProps {
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

export function SmartCreateTemplateButton({
  children,
  variant = "default",
  size = "default",
  className = "",
  showIcon = true,
  customText,
  ...props
}: SmartCreateTemplateButtonProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const { isLoading } = useStripeStatus();

  const handleClick = () => {
    if (isLoading) {
      return;
    }

    setIsNavigating(true);
    router.push("/templates/create");
  };

  const text = children || customText?.create || "Add Template";

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
