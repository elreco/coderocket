"use client";
import { BadgeCheck, ChevronsUpDown, CreditCard, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { logout } from "@/app/(default)/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "@/hooks/use-toast";
import { Tables } from "@/types_db";
import { getInitials } from "@/utils/helpers";

export function NavUser({
  user,
}: {
  user: Tables<"users"> & { email: string | null };
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();

  async function handleLogout() {
    const result = await logout();
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
    if (result.url) {
      toast({
        title: "Success",
        description: "Logged out successfully!",
      });
      router.push(result.url);
      return;
    }
    setOpenMobile(false);
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarImage
                  src={user.avatar_url || ""}
                  alt={user.full_name || ""}
                />
                <AvatarFallback className="rounded-lg bg-background">
                  {getInitials(user.full_name || "")}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user.full_name || ""}
                </span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage
                    src={user.avatar_url || ""}
                    alt={user.full_name || ""}
                  />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.full_name || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user.full_name || ""}
                  </span>
                  <span className="truncate text-xs">{user.email || ""}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/account" onClick={() => setOpenMobile(false)}>
                  <BadgeCheck />
                  My Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/pricing" onClick={() => setOpenMobile(false)}>
                  <CreditCard />
                  Subscribe
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleLogout()}
              className="cursor-pointer"
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
