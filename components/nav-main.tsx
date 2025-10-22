"use client";

import { type IconType } from "@icons-pack/react-simple-icons";
import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string | ReactNode;
    url: string;
    icon: LucideIcon | IconType;
    isActive?: boolean;
    isNew?: boolean;
    external?: boolean;
    onClick?: () => void;
  }[];
  label: string;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton isActive={item.isActive} asChild>
              {item.onClick ? (
                <button
                  className="flex w-full items-center gap-2 text-left"
                  onClick={() => {
                    setOpenMobile(false);
                    item.onClick?.();
                  }}
                >
                  <item.icon />
                  <span>{item.title}</span>
                  {item.isNew && !item.isActive && (
                    <Badge variant="default" className="text-xs">
                      New
                    </Badge>
                  )}
                </button>
              ) : item.external ? (
                <a
                  className="flex items-center gap-2"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpenMobile(false)}
                >
                  <item.icon />
                  <span>{item.title}</span>
                  {item.isNew && !item.isActive && (
                    <Badge variant="default" className="text-xs">
                      New
                    </Badge>
                  )}
                </a>
              ) : (
                <Link
                  className="flex items-center gap-2"
                  href={item.url}
                  onClick={() => setOpenMobile(false)}
                >
                  <item.icon />
                  <span>{item.title}</span>
                  {item.isNew && !item.isActive && (
                    <Badge variant="default" className="text-xs">
                      New
                    </Badge>
                  )}
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
