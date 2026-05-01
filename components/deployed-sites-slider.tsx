"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Rocket } from "lucide-react";
import Link from "next/link";

import { type GetDeployedSitesReturnType } from "@/app/(default)/components/actions";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useCarousel } from "@/components/ui/carousel-hook";
import { buildDeploymentUrl, buildDocsUrl } from "@/utils/runtime-config";

interface DeployedSitesSliderProps {
  sites: GetDeployedSitesReturnType[];
}

export function DeployedSitesSlider({ sites }: DeployedSitesSliderProps) {
  if (!sites || sites.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Latest Deployed Sites</h2>
        <Button asChild variant="outline" size="sm">
          <Link
            href={buildDocsUrl("/deployment/overview")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <Rocket className="size-3" />
            How to deploy
          </Link>
        </Button>
      </div>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full overflow-hidden"
      >
        <div className="relative w-full">
          <CarouselContent className="-ml-4">
            {sites.map((site) => (
              <CarouselItem key={site.chat_id} className="basis-full pl-4">
                <DeployedSiteBanner site={site} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselButtons />
        </div>
      </Carousel>
    </div>
  );
}

function DeployedSiteBanner({ site }: { site: GetDeployedSitesReturnType }) {
  const deployedUrl = site.custom_domain
    ? buildDeploymentUrl({
        customDomain: site.custom_domain,
        chatId: site.chat_id,
        version: site.deployed_version,
      })
    : site.deploy_subdomain
      ? buildDeploymentUrl({
          subdomain: site.deploy_subdomain,
          chatId: site.chat_id,
          version: site.deployed_version,
        })
      : null;

  return (
    <Link
      href={`/components/${site.slug || site.chat_id}`}
      className="group relative flex w-full overflow-hidden rounded-lg border bg-card transition-all hover:shadow-md"
    >
      <div className="relative aspect-video w-64 shrink-0 overflow-hidden bg-muted sm:w-80">
        {site.last_assistant_message ? (
          <img
            src={site.last_assistant_message}
            alt={site.title || site.first_user_message}
            className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.05]"
            style={{ transform: "translateZ(0)" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Rocket className="text-muted-foreground size-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center p-6">
        <h3 className="mb-2 line-clamp-2 text-lg font-semibold leading-tight">
          {site.title || site.first_user_message}
        </h3>
        {deployedUrl && (
          <a
            href={deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:text-primary/80 flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <ExternalLink className="size-4" />
            <span className="truncate">
              {site.custom_domain || site.deploy_subdomain}
            </span>
          </a>
        )}
      </div>
    </Link>
  );
}

function CarouselButtons() {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } =
    useCarousel();

  return (
    <>
      {canScrollPrev && (
        <>
          <div className="from-background via-background/80 pointer-events-none absolute top-0 left-0 z-10 h-full w-24 bg-linear-to-r to-transparent" />
          <Button
            variant="outline"
            size="icon"
            className="absolute top-1/2 left-2 z-20 size-8 -translate-y-1/2 rounded-full"
            onClick={scrollPrev}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </>
      )}
      {canScrollNext && (
        <>
          <div className="from-background via-background/80 pointer-events-none absolute top-0 right-0 z-10 h-full w-24 bg-linear-to-l to-transparent" />
          <Button
            variant="outline"
            size="icon"
            className="absolute top-1/2 right-2 z-20 size-8 -translate-y-1/2 rounded-full"
            onClick={scrollNext}
          >
            <ChevronRight className="size-4" />
          </Button>
        </>
      )}
    </>
  );
}
