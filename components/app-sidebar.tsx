"use client";

import { SiDiscord } from "@icons-pack/react-simple-icons";
import {
  CreditCard,
  Globe,
  Rocket,
  SquareTerminal,
  UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tables } from "@/types_db";

import Logo from "./icons/logo";
import { NavAuth } from "./nav-auth";
import { NavComponents } from "./nav-components";

// This is sample data.
const data = {
  navComponents: [
    {
      title: "Browse Components",
      url: "/components",
      icon: Globe,
      // items: [
      //   {
      //     title: "React Components",
      //     url: "/components/react",
      //   },
      //   {
      //     title: "HTML Components",
      //     url: "/components",
      //   },
      // ],
    },
  ],
  navMain: [
    {
      title: "Generate",
      url: "/",
      icon: SquareTerminal,
    },
    /* {
      title: "Featured",
      url: "/components/featured",
      icon: Star,
    }, */
    {
      title: "Pricing",
      url: "/pricing",
      icon: CreditCard,
    },
    {
      title: (
        <div className="flex items-center gap-2">
          Discord
          <Badge variant="secondary" className="h-5 text-primary">
            New
          </Badge>
        </div>
      ),
      url: "https://discord.gg/t7dQgcYJ5t",
      icon: SiDiscord,
    },
    {
      title: "Changelog",
      url: "/changelog",
      icon: Rocket,
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

  const navComponentsItems = data.navComponents.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }));

  // Ajout du nouvel élément si l'utilisateur est connecté
  const finalNavComponentsItems = user
    ? [
        {
          title: "My Components",
          url: "#",
          icon: UserCircle2,
          isActive: true,
          items: [
            {
              title: "My React Components",
              url: "/account/components/react",
            },
            {
              title: "My HTML Components",
              url: "/account/components",
            },
          ],
        },
      ].map((item) => ({
        ...item,
        items: item.items?.map((subItem) => ({
          ...subItem,
          isActive: pathname === subItem.url,
        })),
      }))
    : null;

  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href="/"
                className="group/link"
                onClick={() => setOpenMobile(false)}
              >
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
        <NavMain items={navMainItems} label="Tailwind AI" />
        <NavMain items={navComponentsItems} label="Public Components" />
        {finalNavComponentsItems && (
          <NavComponents items={finalNavComponentsItems} />
        )}
      </SidebarContent>
      <SidebarFooter>
        {user ? <NavUser user={user} /> : <NavAuth />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
