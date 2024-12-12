import { LucideLogIn, LucideUserPlus } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import { useSidebar } from "./ui/sidebar";

export function NavAuth() {
  const { open, setOpenMobile } = useSidebar();

  return (
    <div className="flex w-full flex-col items-center space-y-2">
      <Link
        href="/login"
        className="w-full"
        onClick={() => setOpenMobile(false)}
      >
        <Button className="flex w-full items-center justify-center">
          <LucideLogIn className={cn("size-4", open ? "mr-1" : "mr-0")} />
          <span className={cn(open ? "block" : "hidden")}>Login</span>
        </Button>
      </Link>
      <Link
        href="/register"
        className="w-full"
        onClick={() => setOpenMobile(false)}
      >
        <Button
          className="flex w-full items-center justify-center"
          variant="background"
        >
          <LucideUserPlus className={cn("size-4", open ? "mr-1" : "mr-0")} />
          <span className={cn(open ? "block" : "hidden")}>Register</span>
        </Button>
      </Link>
    </div>
  );
}
