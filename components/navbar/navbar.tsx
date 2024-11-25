"use client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Logo from "@/components/icons/logo";
import { createClient } from "@/utils/supabase/client";

import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export function Navbar() {
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserData(data.user);
      }
      setIsLoading(false);
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("event", event);
      console.log("session", session);
      if (event === "SIGNED_IN" && session?.user) {
        setUserData(session.user);
      }
      if (event === "SIGNED_OUT") {
        setUserData(null);
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="fixed top-0 z-50 w-full bg-gray-50/75 bg-clip-padding backdrop-blur">
      <div className="relative z-50 flex size-full max-h-full min-h-full justify-between p-4 font-normal sm:px-6 lg:px-8">
        <div className="relative z-10 flex items-center gap-16">
          <Link href="/" aria-label="Home">
            <Logo className="h-10 w-auto" />
          </Link>
          <div className="hidden lg:flex lg:gap-10">
            <NavLinks />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <MobileNav
            user={userData}
            handleSignOut={logout}
            isLoading={isLoading}
          />
        </div>
      </div>
    </header>
  );
}
