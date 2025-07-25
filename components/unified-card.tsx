"use client";

import { SiHtml5, SiReact, SiVuedotjs } from "@icons-pack/react-simple-icons";
import {
  Eye,
  ShoppingCart,
  Tag,
  User,
  Heart,
  GitFork,
  Download,
  Calendar,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Framework } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

export interface UnifiedCardData {
  id: string;
  title: string;
  imageUrl?: string;
  framework: Framework;
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
        : SiHtml5;

  const priceFormatted = data.price
    ? new Intl.NumberFormat("en-US", {
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
    <div
      className={cn(
        "w-full bg-center overflow-hidden relative card rounded-md mx-auto cursor-pointer transition-all duration-200 hover:shadow-lg",
        isReverse ? "bg-background" : "bg-secondary",
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
          <Eye className="size-8 translate-y-4 text-white transition-transform duration-300 ease-in-out group-hover:translate-y-0" />
        </div>

        {/* Top Right Badges */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {priceFormatted && (
            <Badge className="bg-green-600 text-white shadow-sm">
              {priceFormatted}
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
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {data.isOwnItem && (
            <Badge className="bg-blue-600 text-white shadow-sm">
              <User className="mr-1 size-3" />
              Your Item
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex h-36 flex-col justify-between p-4">
        {/* Title and Author */}
        <div className="flex flex-col gap-0.5">
          <h1 className="line-clamp-2 max-w-full whitespace-pre-wrap text-sm font-medium text-foreground hover:text-foreground/80">
            {data.title}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {data.author && (
              <>
                <span
                  className="cursor-pointer hover:text-muted-foreground/80 hover:underline"
                  onClick={handleAuthorClick}
                >
                  {data.author.name}
                </span>
                <span className="text-muted-foreground/60">•</span>
              </>
            )}
            <span>{getRelativeDate(data.createdAt)}</span>
          </div>
          {data.cloneUrl && (
            <a
              href={data.cloneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-xs text-blue-500 hover:text-blue-600 hover:underline"
              title={data.cloneUrl}
              onClick={(e) => e.stopPropagation()}
            >
              {data.cloneUrl
                .replace(/^https?:\/\/(www\.)?/i, "")
                .replace(/\/$/, "")}
            </a>
          )}
        </div>

        {/* Framework Badge and Stats */}
        <div className="mt-5 flex items-center justify-between">
          <Badge className="hover:bg-primary">
            <FrameworkIcon className="mr-1 size-3" />
            <span className="first-letter:uppercase">{data.framework}</span>
          </Badge>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {data.isRemixed && (
              <div className="flex items-center gap-1">
                <GitFork className="size-3" />
                <span>Remixed</span>
              </div>
            )}
            {data.totalSales && data.totalSales > 0 && (
              <div className="flex items-center gap-1">
                <ShoppingCart className="size-3" />
                <span>{data.totalSales}</span>
              </div>
            )}
            {data.likes !== undefined && (
              <div className="flex items-center gap-1.5">
                <Heart
                  className={cn("size-3.5", data.isLiked && "text-pink-500")}
                />
                <span className={cn(data.isLiked && "text-pink-500")}>
                  {data.likes}
                </span>
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
          <div className="mt-2 flex items-center gap-2">{data.actions}</div>
        )}
      </div>
    </div>
  );

  return showActions ? (
    <div>{cardContent}</div>
  ) : (
    <Link href={data.href}>{cardContent}</Link>
  );
}
