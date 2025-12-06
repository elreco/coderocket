"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { type GetDeployedSitesReturnType } from "@/app/(default)/components/actions";
import { cn } from "@/lib/utils";

interface DeployedSiteCardProps {
  site: GetDeployedSitesReturnType;
  className?: string;
}

export function DeployedSiteCard({ site, className }: DeployedSiteCardProps) {
  return (
    <Link
      href={`/components/${site.slug || site.chat_id}`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-lg border border-b-0 bg-card transition-all",
        className,
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {site.deployed_screenshot ? (
          <img
            src={site.deployed_screenshot}
            alt={site.title || site.first_user_message}
            className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.05]"
            style={{ transform: "translateZ(0)" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <div className="text-muted-foreground text-4xl">🚀</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-primary/30 via-primary/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3
            className="mb-1 line-clamp-1 text-sm font-semibold text-white"
            style={{ textShadow: "0 1px 1px rgba(0, 0, 0, 0.45)" }}
          >
            {site.title || site.first_user_message}
          </h3>
          <div className="flex flex-col gap-1">
            {site.deploy_subdomain && (
              <a
                href={`https://${site.deploy_subdomain}.coderocket.app`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-white/80 hover:text-primary flex items-center gap-1.5 text-xs transition-colors"
                style={{ textShadow: "0 1px 1px rgba(0, 0, 0, 0.45)" }}
              >
                <ExternalLink className="size-3" />
                <span className="truncate">
                  {site.deploy_subdomain}.coderocket.app
                </span>
              </a>
            )}
            {site.custom_domain && (
              <a
                href={`https://${site.custom_domain}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-white/90 hover:text-primary flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ textShadow: "0 1px 1px rgba(0, 0, 0, 0.45)" }}
              >
                <ExternalLink className="size-3" />
                <span className="truncate">{site.custom_domain}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
