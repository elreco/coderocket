"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { type GetComponentsReturnType } from "@/app/(default)/components/actions";
import { ComponentCard } from "@/components/component-card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useCarousel } from "@/components/ui/carousel-hook";

interface ComponentsSliderProps {
  components: GetComponentsReturnType[];
}

export function ComponentsSlider({ components }: ComponentsSliderProps) {
  if (!components || components.length === 0) {
    return null;
  }

  return (
    <Carousel
      opts={{
        align: "start",
        loop: false,
      }}
      className="w-full overflow-hidden"
    >
      <div className="relative w-full">
        <CarouselContent className="-ml-4">
          {components.map((chat) => (
            <CarouselItem key={chat.chat_id} className="basis-auto pl-4">
              <div className="w-[280px]">
                <ComponentCard chat={chat} />
              </div>
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
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/3 z-20 size-8 -translate-y-1/2 rounded-full"
            onClick={scrollPrev}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </>
      )}
      {canScrollNext && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background via-background/80 to-transparent" />
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/3 z-20 size-8 -translate-y-1/2 rounded-full"
            onClick={scrollNext}
          >
            <ChevronRight className="size-4" />
          </Button>
        </>
      )}
    </>
  );
}
