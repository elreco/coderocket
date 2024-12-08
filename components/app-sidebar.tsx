"use client";

import {
  CreditCard,
  Globe,
  Rocket,
  Sprout,
  SquareTerminal,
  Star,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Tables } from "@/types_db";

import Logo from "./icons/logo";
import { NavAuth } from "./nav-auth";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Generate",
      url: "/",
      icon: SquareTerminal,
    },
    {
      title: "Featured",
      url: "/components/featured",
      icon: Star,
    },
    {
      title: "Browse Components",
      url: "/components",
      icon: Globe,
    },
    {
      title: "Pricing",
      url: "/pricing",
      icon: CreditCard,
    },
  ],
  other: [
    {
      title: "Changelog",
      url: "/changelog",
      icon: Rocket,
    },
    {
      title: "Product Hunt",
      url: "https://www.producthunt.com/posts/tailwind-ai?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-tailwind&#0045;ai",
      icon: Sprout,
    },
  ],
};
export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: (Tables<"users"> & { email: string | null }) | null;
}) {
  const pathname = usePathname();

  const navMainItems = data.navMain.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }));

  const navOtherItems = data.other.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" className="group/link">
                <Logo
                  className="group-hover/link:hidden"
                  src="/logo-alternate.png"
                />
                <Logo
                  className="hidden group-hover/link:block"
                  src="/logo-white.png"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Tailwind AI</span>
                  <span className="truncate text-xs text-sidebar-primary group-hover/link:text-sidebar-primary-foreground">
                    AI-powered Tailwind CSS
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} label="Components" />
        <NavMain items={navOtherItems} label="Other" />
      </SidebarContent>
      <SidebarFooter>
        {user ? <NavUser user={user} /> : <NavAuth />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
