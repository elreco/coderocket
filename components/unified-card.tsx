"use client";

import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
} from "@icons-pack/react-simple-icons";
import { Eye, Activity, GitFork, Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { toggleChatLike } from "@/app/(default)/components/actions";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { avatarApi, Framework } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";
import { buildAppUrl } from "@/utils/runtime-config";

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
  totalSales?: number;
  likes?: number;
  isLiked?: boolean;
  isRemixed?: boolean;
  remixesCount?: number;
  user_avatar_url?: string;
  cloneUrl?: string;
}

interface UnifiedCardProps {
  data: UnifiedCardData;
  isReverse?: boolean;
  className?: string;
  isLoggedIn?: boolean;
}

export function UnifiedCard({
  data,
  isReverse = false,
  className,
  isLoggedIn = false,
}: UnifiedCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(data.isLiked || false);
  const [likesCount, setLikesCount] = useState(data.likes || 0);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      toast({
        title: "Can't like component",
        description: "Please login to like a component",
        duration: 4000,
      });
      return;
    }

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount((prev) => (newIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    const result = await toggleChatLike(data.id);

    if (result?.error) {
      setIsLiked(!newIsLiked);
      setLikesCount((prev) => (newIsLiked ? Math.max(0, prev - 1) : prev + 1));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to like component. Please try again.",
        duration: 4000,
      });
    }
  };
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

  // Framework colors
  const getFrameworkColorClass = () => {
    switch (data.framework) {
      case Framework.REACT:
        return "group-hover:text-[#61DAFB]"; // React blue
      case Framework.VUE:
        return "group-hover:text-[#4FC08D]"; // Vue green
      case Framework.SVELTE:
        return "group-hover:text-[#FF3E00]"; // Svelte orange
      case Framework.ANGULAR:
        return "group-hover:text-[#DD0031]"; // Angular red
      default:
        return "group-hover:text-[#E34F26]"; // HTML orange
    }
  };

  const priceFormatted =
    data.price !== undefined
      ? data.price === 0
        ? "INCLUDED"
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
          "card border-border relative mx-auto w-full cursor-pointer overflow-hidden rounded-md border bg-center transition-all duration-800 hover:shadow-lg",
          isReverse ? "bg-background" : "bg-primary/5",
          className,
        )}
      >
        {/* Image */}
        <div
          className="group relative aspect-video w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${
              data.imageUrl || buildAppUrl("/placeholder.svg")
            })`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100">
            <Button
              variant="outline"
              size="sm"
              className="flex translate-y-4 items-center gap-2 transition-transform duration-300 ease-in-out group-hover:translate-y-0"
            >
              <Eye className="size-8 text-white" />
              <span>View Details</span>
            </Button>
            {isLoggedIn && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLikeClick}
                className={cn(
                  "flex translate-y-4 items-center gap-2 transition-transform duration-300 ease-in-out group-hover:translate-y-0",
                  isLiked && "text-primary",
                )}
              >
                <Heart
                  className={cn(
                    "size-8",
                    isLiked ? "text-primary fill-primary" : "text-white",
                  )}
                  fill={isLiked ? "currentColor" : "none"}
                />
                {likesCount > 0 && (
                  <span className={cn(isLiked ? "text-primary" : "text-white")}>
                    {likesCount}
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* Top Right Badges */}
          <div className="absolute top-3 right-3 flex flex-row items-center gap-2">
            {priceFormatted && (
              <Badge
                className={cn(
                  "font-semibold shadow-xs",
                  data.price === 0
                    ? "bg-emerald-500 text-white hover:bg-emerald-500"
                    : "bg-green-600 text-white hover:bg-green-600",
                )}
              >
                {priceFormatted}
              </Badge>
            )}
            {data.totalSales !== undefined && (
              <Badge className="bg-blue-600 text-white shadow-xs hover:bg-blue-600">
                <Activity className="mr-1 size-3" />
                {data.totalSales} use{data.totalSales !== 1 ? "s" : ""}
              </Badge>
            )}
            {likesCount > 0 && (
              <Badge className="bg-pink-500 text-white shadow-xs hover:bg-pink-500">
                <Heart className="mr-1 size-3" fill="currentColor" />
                {likesCount}
              </Badge>
            )}
            {data.remixesCount !== undefined && data.remixesCount > 0 && (
              <Badge className="bg-blue-500 text-white shadow-xs hover:bg-blue-500">
                <GitFork className="mr-1 size-3" />
                {data.remixesCount}
              </Badge>
            )}
          </div>
          {/* Framework Icon - Bottom Right */}
          <div className="absolute bottom-3 right-3">
            <div className="flex flex-col items-center gap-1">
              <FrameworkIcon
                className={cn(
                  "size-8 transition-all duration-300 group-hover:opacity-100 drop-shadow-sm",
                  getFrameworkColorClass(),
                )}
                style={{ filter: "drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25))" }}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-300 group-hover:opacity-100 capitalize",
                  getFrameworkColorClass(),
                )}
                style={{ textShadow: "0 1px 1px rgba(0, 0, 0, 0.45)" }}
              >
                {data.framework}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
      </div>
      <div className="flex min-h-16 flex-col">
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
      </div>
    </div>
  );

  return <Link href={data.href}>{cardContent}</Link>;
}
