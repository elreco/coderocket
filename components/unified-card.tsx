"use client";

import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
} from "@icons-pack/react-simple-icons";
import { Eye, Activity, Tag, User, GitFork, Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

import { ClonedUrlBadge } from "@/components/cloned-url-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { avatarApi, Framework } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export interface UnifiedCardData {
  id: string;
  title: string;
  imageUrl?: string;
  framework: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
  };
  href: string;
  price?: number;
  currency?: string;
  category?: {
    name: string;
  };
  totalSales?: number;
  likes?: number;
  isLiked?: boolean;
  isRemixed?: boolean;
  isOwnItem?: boolean;
  user_avatar_url?: string;
  cloneUrl?: string;
  badges?: Array<{
    text: string;
    variant?: "default" | "secondary" | "outline";
    className?: string;
  }>;
  actions?: ReactNode;
  stats?: Array<{
    icon: ReactNode;
    value: string | number;
    className?: string;
  }>;
}

interface UnifiedCardProps {
  data: UnifiedCardData;
  isReverse?: boolean;
  showActions?: boolean;
  className?: string;
}

export function UnifiedCard({
  data,
  isReverse = false,
  showActions = false,
  className,
}: UnifiedCardProps) {
  const router = useRouter();
  const FrameworkIcon =
    data.framework === Framework.REACT
      ? SiReact
      : data.framework === Framework.VUE
        ? SiVuedotjs
        : data.framework === Framework.SVELTE
          ? SiSvelte
          : data.framework === Framework.ANGULAR
            ? SiAngular
            : SiHtml5;

  const priceFormatted =
    data.price !== undefined
      ? data.price === 0
        ? "FREE"
        : new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: data.currency || "USD",
          }).format(data.price / 100)
      : null;

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (data.author?.id) {
      router.push(`/users/${data.author.id}`);
    }
  };

  const cardContent = (
    <div className="flex flex-col">
      <div
        className={cn(
          "card border-primary/20 relative mx-auto w-full cursor-pointer overflow-hidden rounded-md border bg-center transition-all duration-800 hover:shadow-lg",
          isReverse ? "bg-background" : "bg-primary/5",
          data.isLiked && "border border-pink-500",
          className,
        )}
      >
        {/* Image */}
        <div
          className="group relative aspect-video w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${
              data.imageUrl || "https://www.coderocket.app/placeholder.svg"
            })`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100">
            <Button
              variant="outline"
              size="sm"
              className="flex translate-y-4 items-center gap-2 transition-transform duration-300 ease-in-out group-hover:translate-y-0"
            >
              <Eye className="size-8 text-white" />
              <span>View Component</span>
            </Button>
          </div>

          {/* Top Right Badges */}
          <div className="absolute top-3 right-3 flex flex-row items-center gap-2">
            {priceFormatted && (
              <Badge
                className={cn(
                  "font-semibold shadow-xs",
                  data.price === 0
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-green-600 text-white hover:bg-green-700",
                )}
              >
                {priceFormatted}
              </Badge>
            )}
            {data.totalSales !== undefined && (
              <Badge className="bg-blue-600 text-white shadow-xs hover:bg-blue-700">
                <Activity className="mr-1 size-3" />
                {data.totalSales} use{data.totalSales !== 1 ? "s" : ""}
              </Badge>
            )}
            <Badge className="hover:bg-primary">
              <FrameworkIcon className="mr-1 size-3" />
              <span className="first-letter:uppercase">{data.framework}</span>
            </Badge>
            {data.likes !== undefined && data.likes > 0 && (
              <Badge className="bg-pink-500 text-white shadow-xs hover:bg-pink-600">
                <Heart className="mr-1 size-3" />
                {data.likes}
              </Badge>
            )}
            {data.badges?.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.variant || "default"}
                className={badge.className}
              >
                {badge.text}
              </Badge>
            ))}
          </div>

          {/* Top Left Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {data.isOwnItem && (
              <Badge className="bg-purple-600 text-white shadow-xs">
                <User className="mr-1 size-3" />
                Your Item
              </Badge>
            )}
          </div>
          <div className="absolute bottom-3 left-3">
            {data.cloneUrl && (
              <ClonedUrlBadge url={data.cloneUrl} showTooltip={true} />
            )}
          </div>
        </div>

        {/* Content */}
      </div>
      <div className="flex h-24 flex-col">
        {/* Title and Author */}
        <div className="mt-2 flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div onClick={handleAuthorClick}>
                  <Avatar className="border-border size-8 cursor-pointer border">
                    <AvatarImage src={data.user_avatar_url || undefined} />
                    <AvatarFallback>
                      <img
                        src={`${avatarApi}${data.author?.name}`}
                        alt="logo"
                        className="size-full"
                      />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2 px-3 py-2">
                <Avatar className="border-border size-6 border">
                  <AvatarImage src={data.user_avatar_url || undefined} />
                  <AvatarFallback>
                    <img
                      src={`${avatarApi}${data.author?.name}`}
                      alt="logo"
                      className="size-full"
                    />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">
                  {data.author?.name || "Anonymous user"}
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-foreground hover:text-foreground/80 line-clamp-1 max-w-full text-xs font-medium break-all">
              {data.title}
            </h1>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span>{getRelativeDate(data.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Framework Badge and Stats */}
        <div className="mt-2 flex items-center justify-between">
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            {data.isRemixed && (
              <div className="flex items-center gap-1">
                <GitFork className="size-3" />
                <span>Remixed</span>
              </div>
            )}

            {data.category && (
              <div className="flex items-center gap-1.5">
                <Tag className="size-3" />
                <span>{data.category.name}</span>
              </div>
            )}
            {data.stats?.map((stat, index) => (
              <div
                key={index}
                className={cn("flex items-center gap-1", stat.className)}
              >
                {stat.icon}
                <span>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {showActions && data.actions && (
          <div className="mt-1 flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">{data.actions}</div>
            {data.href && (
              <Link
                href={data.href}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1 text-xs"
                onClick={(e) => e.stopPropagation()}
                title="View listing"
              >
                <Eye className="size-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return showActions ? (
    <div
      className="cursor-pointer"
      onClick={() => data.href && router.push(data.href)}
    >
      {cardContent}
    </div>
  ) : (
    <Link href={data.href}>{cardContent}</Link>
  );
}
