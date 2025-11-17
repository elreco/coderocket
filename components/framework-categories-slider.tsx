"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { type GetComponentsReturnType } from "@/app/(default)/components/actions";
import { FrameworkCategoryCard } from "@/components/framework-category-card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useCarousel } from "@/components/ui/carousel-hook";
import { Framework } from "@/utils/config";

interface FrameworkCategoriesSliderProps {
  categories: {
    framework: Framework;
    components: GetComponentsReturnType[];
  }[];
  onCategoryClick: (framework: Framework) => void;
}

export function FrameworkCategoriesSlider({
  categories,
  onCategoryClick,
}: FrameworkCategoriesSliderProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <Carousel
      opts={{
        align: "start",
        loop: false,
      }}
      className="mb-5 w-full overflow-hidden"
    >
      <div className="relative w-full">
        <CarouselContent className="-ml-4">
          {categories.map(({ framework, components }) => (
            <CarouselItem key={framework} className="basis-auto pl-4">
              <FrameworkCategoryCard
                framework={framework}
                components={components}
                onClick={() => onCategoryClick(framework)}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselButtons />
      </div>
    </Carousel>
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
