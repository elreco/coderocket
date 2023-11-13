import Link from "next/link";

import { getSession } from "@/app/supabase-server";
import Logo from "@/components/icons/logo";

import { Container } from "../container";

import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export async function Navbar() {
  const session = await getSession();
  return (
    <header className="fixed z-50 w-full bg-gray-50 bg-opacity-95 bg-clip-padding backdrop-blur">
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
          <MobileNav session={session} />
        </div>
      </Container>
    </header>
  );
}
