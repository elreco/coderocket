"use client";

import { SiDiscord } from "@icons-pack/react-simple-icons";
import {
  CreditCard,
  Globe,
  Heart,
  Rocket,
  SquareTerminal,
  SquareUserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect, useState } from "react";

import { getNotification } from "@/app/(default)/actions";
import { getUserDetails } from "@/app/supabase-client";
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
    },
  ],
  myComponents: [
    {
      title: "My Components",
      url: "/account/components",
      icon: SquareUserRoundIcon,
    },
    {
      title: "Liked Components",
      url: "/account/liked-components",
      icon: Heart,
    },
  ],
  community: [
    {
      title: "Discord",
      url: discordLink,
      icon: SiDiscord,
    },
    {
      title: "Changelog",
      url: "/changelog",
      icon: Rocket,
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
      try {
        const userDetails = await getUserDetails();
        if (userDetails) {
          setUser(userDetails);
        }
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'utilisateur:",
          error,
        );
      } finally {
        setIsLoading(false);
      }
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
    if (defaultUser) {
      setUser(defaultUser);
    }
  }, [defaultUser]);

  const navMainItems = data.navMain.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }));

  const allComponentsItems = [
    ...data.navComponents.map((item) => ({
      ...item,
      isActive: pathname === item.url,
    })),
    ...(user
      ? data.myComponents.map((item) => ({
          ...item,
          isActive: pathname === item.url,
        }))
      : []),
  ];

  const communityItems = data.community.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }));

  const { open, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href="/"
                className="group/link flex items-center gap-2"
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
                  <span className="truncate text-sm font-semibold text-sidebar-primary group-hover/link:text-sidebar-primary-foreground">
                    CodeRocket
                  </span>
                  <span className="truncate text-xs">
                    AI-powered Tailwind components
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} label="CodeRocket" />
        <NavMain items={allComponentsItems} label="Components" />
        <NavMain items={communityItems} label="Community" />
      </SidebarContent>
      <SidebarFooter>
        {notification?.is_active && (
          <div
            className={`flex p-1 ${
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
        {isLoading ? null : user ? (
          <NavUser user={user} onLogout={() => setUser(null)} />
        ) : (
          <NavAuth />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
