import Link from "next/link";

import { createServerSupabaseClient } from "@/app/supabase-server";
import Logo from "@/components/icons/logo";

import { Container } from "../container";

import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export async function Navbar() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <header className="fixed z-50 w-full bg-slate-50 bg-opacity-95 bg-clip-padding backdrop-blur">
      <Container className="relative z-50 flex justify-between py-4">
        <div className="relative z-10 flex items-center gap-16">
          <Link href="/" aria-label="Home">
            <Logo className="h-10 w-auto" />
          </Link>
          <div className="hidden lg:flex lg:gap-10">
            <NavLinks />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <MobileNav user={user} />
        </div>
      </Container>
    </header>
  );
}
