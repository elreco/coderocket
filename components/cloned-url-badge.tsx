import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, truncateMiddle } from "@/lib/utils";

interface ClonedUrlBadgeProps {
  className?: string;
  url: string;
  maxLength?: number;
  showTooltip?: boolean;
}

export function ClonedUrlBadge({
  className,
  url,
  maxLength = 30,
  showTooltip = true,
}: ClonedUrlBadgeProps) {
  const cleanUrl = url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const buttonContent = (
    <Button
      variant="outline"
      size="sm"
      asChild
      className={cn("w-fit", className)}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex text-xs text-blue-500 hover:text-blue-600 hover:underline"
        onClick={handleClick}
      >
        <Globe className="size-4" />
        {truncateMiddle(cleanUrl, maxLength)}
      </a>
    </Button>
  );

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent>
          <p>Component cloned from this website</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}
