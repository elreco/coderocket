import { Rocket } from "lucide-react";
import Link from "next/link";
import React from "react";

export const Watermark = ({ slug }: { slug: string }) => {
  return (
    <div className="absolute bottom-0 right-0 z-[9999] m-6">
      <Link href={`https://www.tailwindai.dev/components/${slug}`}>
        <div className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary p-2 shadow-lg hover:bg-primary/90">
          <img
            src="https://www.tailwindai.dev/logo-white.png"
            alt="Tailwind AI"
            className="w-6"
          />

          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <span>Built with Tailwind AI</span> <Rocket className="w-4" />
          </p>
        </div>
      </Link>
    </div>
  );
};
