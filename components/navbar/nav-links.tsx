"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { links } from "@/utils/links";

export function NavLinks() {
  const pathname = usePathname();

  return links.map(([label, href]) => (
    <Link
      key={label}
      href={href}
      className={clsx(
        pathname === href && "bg-gray-900 !text-gray-50 hover:!bg-gray-700",
        "relative -mx-3 -my-2 rounded-full px-3 py-0.5 text-sm text-gray-900 transition-all duration-300 hover:text-gray-700",
      )}
    >
      <span className="relative z-10">{label}</span>
    </Link>
  ));
}
