"use client";

import {
  SiDiscord,
  SiHtml5,
  SiReact,
  SiVuedotjs,
} from "@icons-pack/react-simple-icons";
import { CreditCard, Globe, Rocket, SquareTerminal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect, useState } from "react";

import { getNotification } from "@/app/(default)/actions";
import { getUserDetails } from "@/app/supabase-client";
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
import { discordLink } from "@/utils/config";

import Logo from "./icons/logo";
import { NavAuth } from "./nav-auth";
import { SidebarNotification } from "./sidebar-notification";

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
  myComponents: [
    {
      title: "My React Components",
      url: "/account/components/react",
      icon: SiReact,
    },
    {
      title: "My Vue Components",
      url: "/account/components/vue",
      icon: SiVuedotjs,
    },
    {
      title: "My HTML Components",
      url: "/account/components",
      icon: SiHtml5,
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
      url: discordLink,
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
  defaultUser,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  defaultUser: (Tables<"users"> & { email: string | null }) | null;
}) {
  const [user, setUser] = useState<
    (Tables<"users"> & { email: string | null }) | null
  >(defaultUser);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const [notification, setNotification] =
    useState<Tables<"notification"> | null>(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      const userDetails = await getUserDetails();
      setUser(userDetails);
      setIsLoading(false);
    };
    fetchUserDetails();
  }, []);

  useEffect(() => {
    const fetchNotification = async () => {
      const notification = await getNotification();
      setNotification(notification);
    };
    fetchNotification();
  }, []);

  useEffect(() => {
    setUser(defaultUser);
  }, [defaultUser]);

  const navMainItems = data.navMain.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }));

  const navComponentsItems = data.navComponents.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }));

  const myComponentsItems = user
    ? data.myComponents.map((item) => ({
        ...item,
        isActive: pathname === item.url,
      }))
    : [];

  const { open, setOpenMobile } = useSidebar();

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
        {user && <NavMain items={myComponentsItems} label="My Components" />}
      </SidebarContent>
      <SidebarFooter>
        {notification?.is_active && (
          <div
            className={`p-1 ${
              open
                ? "visible opacity-100 transition-opacity delay-200 duration-500"
                : "invisible opacity-0"
            }`}
          >
            <SidebarNotification
              title={notification.title}
              description={notification.description}
              buttonLink={notification.button_link ?? undefined}
              buttonLabel={notification.button_label ?? undefined}
            />
          </div>
        )}
        {isLoading ? null : user ? <NavUser user={user} /> : <NavAuth />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
