"use client";

import { Popover } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/20/solid";
import { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/app/supabase-provider";
import { links } from "@/utils/links";

import { Button } from "../ui/button";

function MenuIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 6h14M5 18h14M5 12h14"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MobileNavLink(
  props: Omit<
    React.ComponentPropsWithoutRef<typeof Popover.Button<typeof Link>>,
    "as" | "className"
  >,
) {
  return (
    <Popover.Button
      as={Link}
      className="block text-base leading-7 tracking-tight text-gray-700"
      {...props}
    />
  );
}

interface Props {
  session: Session | null;
}

export function MobileNav({ session }: Props) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };
  return (
    <div className="flex items-center gap-6">
      <Popover className="lg:hidden">
        {({ open }) => (
          <>
            <Popover.Button
              className="relative z-10 -m-2 inline-flex items-center rounded-lg stroke-gray-900 p-2 hover:bg-gray-200/50 hover:stroke-gray-600 active:stroke-gray-900 ui-not-focus-visible:outline-none"
              aria-label="Toggle site navigation"
            >
              {({ open }) =>
                open ? (
                  <ChevronUpIcon className="h-6 w-6" />
                ) : (
                  <MenuIcon className="h-6 w-6" />
                )
              }
            </Popover.Button>
            <AnimatePresence initial={false}>
              {open && (
                <>
                  <Popover.Overlay
                    static
                    as={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-0 bg-gray-300/60 backdrop-blur"
                  />
                  <Popover.Panel
                    static
                    as={motion.div}
                    initial={{ opacity: 0, y: -32 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      y: -32,
                      transition: { duration: 0.2 },
                    }}
                    className="absolute inset-x-0 top-0 z-0 origin-top rounded-b-2xl bg-gray-50 px-6 pb-6 pt-32 shadow-2xl shadow-gray-900/20 backdrop-blur"
                  >
                    <div className="space-y-4">
                      {links.map(([label, href], index) => (
                        <MobileNavLink key={index} href={href}>
                          {label}
                        </MobileNavLink>
                      ))}
                    </div>
                    <a
                      href="https://www.producthunt.com/posts/tailwind-ai?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-tailwind&#0045;ai"
                      target="_blank"
                    >
                      <img
                        className="my-3"
                        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=426541&theme=dark"
                        alt="Tailwind&#0032;AI - AI&#0045;Powered&#0032;Tailwind&#0032;Component&#0032;Generation | Product Hunt"
                        style={{ width: "250px", height: "54px" }}
                        width="250"
                        height="54"
                      />
                    </a>
                    <div className="mt-8 flex flex-col gap-4">
                      {!session ? (
                        <Popover.Button
                          as={Button}
                          href="/signin"
                          variant="outline"
                        >
                          Log in
                        </Popover.Button>
                      ) : (
                        <Popover.Button
                          as={Button}
                          onClick={handleSignOut}
                          variant="outline"
                        >
                          Sign Out
                        </Popover.Button>
                      )}
                    </div>
                  </Popover.Panel>
                </>
              )}
            </AnimatePresence>
          </>
        )}
      </Popover>
      <a
        href="https://www.producthunt.com/posts/tailwind-ai?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-tailwind&#0045;ai"
        target="_blank"
      >
        <img
          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=426541&theme=dark"
          alt="Tailwind&#0032;AI - AI&#0045;Powered&#0032;Tailwind&#0032;Component&#0032;Generation | Product Hunt"
          className="h-[40px] w-[180px]"
        />
      </a>
      {!session ? (
        <Button href="/signin" variant="outline" className="hidden lg:block">
          Log in
        </Button>
      ) : (
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="hidden lg:block"
        >
          Sign Out
        </Button>
      )}
    </div>
  );
}
