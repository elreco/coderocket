import { GitFork } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RemixOriginalBadgeProps {
  className?: string;
  originalChat: {
    slug: string | null;
    title?: string | null;
  };
  showTooltip?: boolean;
}

export function RemixOriginalBadge({
  className,
  originalChat,
  showTooltip = true,
}: RemixOriginalBadgeProps) {
  if (!originalChat.slug) {
    return null;
  }

  const buttonContent = (
    <Button
      variant="outline"
      size="sm"
      asChild
      className={cn("w-fit py-1 h-auto px-2", className)}
    >
      <a
        href={`/components/${originalChat.slug}`}
        className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        <GitFork className="size-2" />
        {originalChat.title || `Component ${originalChat.slug}`}
      </a>
    </Button>
  );

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent>
          <p>This component is a remix of this original component</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}
