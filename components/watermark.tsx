import { Rocket } from "lucide-react";
import Link from "next/link";
import React from "react";

export const Watermark = ({ slug }: { slug?: string | null }) => {
  return (
    <div className="absolute right-0 bottom-0 z-9999 m-6">
      <Link
        href={
          slug
            ? `https://www.coderocket.app/components/${slug}`
            : "https://www.coderocket.app"
        }
      >
        <div className="bg-primary hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg p-2 shadow-lg">
          <img
            src="https://www.coderocket.app/logo-white.png"
            alt="CodeRocket"
            className="w-6"
          />

          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <span>Built with CodeRocket</span> <Rocket className="w-4" />
          </p>
        </div>
      </Link>
    </div>
  );
};
