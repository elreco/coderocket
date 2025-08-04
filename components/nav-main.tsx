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
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
