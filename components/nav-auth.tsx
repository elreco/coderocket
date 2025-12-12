"use client";

import { LucideLogIn, LucideUserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthModal } from "@/hooks/use-auth-modal";

import { Button } from "./ui/button";
import { useSidebar } from "./ui/sidebar";

export function NavAuth() {
  const { open, setOpenMobile } = useSidebar();
  const { openLogin, openSignup } = useAuthModal();

  const handleLogin = () => {
    setOpenMobile(false);
    openLogin();
  };

  const handleSignup = () => {
    setOpenMobile(false);
    openSignup();
  };

  return (
    <div className="flex w-full flex-col items-center space-y-2">
      <Button
        className="flex w-full items-center justify-center"
        onClick={handleLogin}
      >
        <LucideLogIn className={cn("size-4", open ? "mr-1" : "mr-0")} />
        <span className={cn(open ? "block" : "hidden")}>Login</span>
      </Button>
      <Button
        className="flex w-full items-center justify-center"
        variant="background"
        onClick={handleSignup}
      >
        <LucideUserPlus className={cn("size-4", open ? "mr-1" : "mr-0")} />
        <span className={cn(open ? "block" : "hidden")}>Register</span>
      </Button>
    </div>
  );
}
