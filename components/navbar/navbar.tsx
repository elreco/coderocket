"use server";
import { revalidatePath } from "next/cache";
import Link from "next/link";

import Logo from "@/components/icons/logo";
import { createClient } from "@/utils/supabase/server";

import { Container } from "../container";

import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export async function Navbar() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  async function logout() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    revalidatePath("/chats/[id]");
  }

  return (
    <header className="fixed z-50 w-full bg-gray-50/75 bg-clip-padding backdrop-blur">
      <Container className="relative z-50 flex justify-between !py-4">
        <div className="relative z-10 flex items-center gap-16">
          <Link href="/" aria-label="Home">
            <Logo className="h-10 w-auto" />
          </Link>
          <div className="hidden lg:flex lg:gap-10">
            <NavLinks />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <MobileNav user={userData.user} handleSignOut={logout} />
        </div>
      </Container>
    </header>
  );
}
