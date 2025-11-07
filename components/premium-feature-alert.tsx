"use client";

import { Crown } from "lucide-react";
import { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface PremiumFeatureAlertProps {
  title?: string;
  description: string;
  showUpgradeButton?: boolean;
  className?: string;
  children?: ReactNode;
}

export function PremiumFeatureAlert({
  title = "Premium feature required",
  description,
  showUpgradeButton = true,
  className = "",
  children,
}: PremiumFeatureAlertProps) {
  return (
    <div
      className={`flex items-start space-x-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30 ${className}`}
    >
      <Crown className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-500" />
      <div className="flex-1 space-y-2">
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {title}
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {description}
          </p>
        </div>
        {showUpgradeButton && !children && (
          <Button variant="outline" size="sm" asChild>
            <a href="/pricing" className="flex items-center gap-1.5">
              <Crown className="size-3.5" />
              <span>Upgrade to Premium</span>
            </a>
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
