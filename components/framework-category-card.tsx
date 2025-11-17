"use client";

import {
  SiHtml5,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiAngular,
} from "@icons-pack/react-simple-icons";
import Image from "next/image";

import { type GetComponentsReturnType } from "@/app/(default)/components/actions";
import { Framework } from "@/utils/config";

interface FrameworkCategoryCardProps {
  framework: Framework;
  components: GetComponentsReturnType[];
  onClick: () => void;
}

const frameworkConfig = {
  react: {
    name: "React",
    icon: SiReact,
    color: "text-[#61DAFB]",
    bgColor: "from-[#61DAFB]/10 to-[#61DAFB]/5",
  },
  vue: {
    name: "Vue",
    icon: SiVuedotjs,
    color: "text-[#4FC08D]",
    bgColor: "from-[#4FC08D]/10 to-[#4FC08D]/5",
  },
  html: {
    name: "HTML",
    icon: SiHtml5,
    color: "text-[#E34F26]",
    bgColor: "from-[#E34F26]/10 to-[#E34F26]/5",
  },
  svelte: {
    name: "Svelte",
    icon: SiSvelte,
    color: "text-[#FF3E00]",
    bgColor: "from-[#FF3E00]/10 to-[#FF3E00]/5",
  },
  angular: {
    name: "Angular",
    icon: SiAngular,
    color: "text-[#DD0031]",
    bgColor: "from-[#DD0031]/10 to-[#DD0031]/5",
  },
};

export function FrameworkCategoryCard({
  framework,
  components,
  onClick,
}: FrameworkCategoryCardProps) {
  const config = frameworkConfig[framework];
  const Icon = config.icon;
  const displayComponents = components.slice(0, 4);

  return (
    <button
      onClick={onClick}
      className="group cursor-pointer border-border from-secondary to-background hover:border-primary relative w-[320px] shrink-0 overflow-hidden rounded-lg border bg-linear-to-br p-4 text-left transition-all duration-300 hover:shadow-xl"
    >
      <div className="absolute top-3 right-3 z-0">
        <Icon
          className={`${config.color} size-12 opacity-10 transition-all duration-700 ease-out group-hover:opacity-100`}
        />
      </div>

      <h3 className="mb-2 text-sm">{config.name}</h3>

      <div className="relative z-10 grid grid-cols-2 gap-1">
        {displayComponents.map((component, index) => (
          <div
            key={component.chat_id}
            style={{
              transitionTimingFunction: "cubic-bezier(0, 0, .2, 1)",
            }}
            className={`bg-background relative aspect-video w-full overflow-hidden rounded ${
              index === 0
                ? "z-10 origin-top-left transition-transform duration-500 group-hover:scale-[2.05]"
                : "transition-opacity delay-200 duration-500 group-hover:opacity-0"
            }`}
          >
            {component.screenshot ? (
              <Image
                src={component.screenshot}
                alt={component.title || "Component"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="bg-secondary text-muted-foreground flex size-full items-center justify-center text-xs">
                No preview
              </div>
            )}
          </div>
        ))}
        {displayComponents.length < 4 &&
          Array.from({ length: 4 - displayComponents.length }).map(
            (_, index) => (
              <div
                key={`empty-${index}`}
                className="border-border bg-secondary/50 aspect-video rounded border border-dashed transition-opacity delay-200 duration-500 ease-out group-hover:opacity-0"
              />
            ),
          )}
      </div>
    </button>
  );
}
