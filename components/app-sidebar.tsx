"use client";

import { SiDiscord } from "@icons-pack/react-simple-icons";
import {
  BookOpen,
  CreditCard,
  Globe,
  MessageCircle,
  Rocket,
  SquareTerminal,
  Box,
  HelpCircle,
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
    {
      title: "Templates",
      url: "/templates",
      icon: Box,
      isNew: true,
    },
  ],
  community: [
    {
      title: "Discord",
      url: discordLink,
      icon: SiDiscord,
    },
    {
      title: "Support Chat",
      url: "#",
      icon: MessageCircle,
      external: false,
      onClick: () => {
        if (typeof window !== "undefined" && window.openCrispChat) {
          window.openCrispChat();
        }
      },
    },
    {
      title: "FAQ",
      url: "/faq",
      icon: HelpCircle,
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
    {
      title: "Documentation",
      url: "https://docs.coderocket.app",
      icon: BookOpen,
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
                  <span className="truncate text-xs">AI-powered Tailwind</span>
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
        <div className={`flex justify-center p-1 ${open ? "block" : "hidden"}`}>
          <a
            href="https://www.producthunt.com/products/tailwind-ai?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-coderocket"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1033622&theme=light&t=1762107724575"
              alt="CodeRocket - Transform your ideas into production-ready web applications | Product Hunt"
              width="180"
              height="39"
              className="h-auto w-[180px]"
            />
          </a>
        </div>
        {notification?.is_active && (
          <div className={`flex p-1 ${open ? "block" : "hidden"}`}>
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
