"use client";

import { Popover } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/20/solid";
import { User } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

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
  user: User | null;
  handleSignOut: () => Promise<void>;
}

export function MobileNav({ user, handleSignOut }: Props) {
  return (
    <div className="flex items-center gap-3">
      <Popover className="flex items-center lg:hidden">
        {({ open }) => (
          <>
            <Popover.Button
              className="relative z-10 -m-2 inline-flex items-center rounded-lg stroke-gray-900 p-2 hover:bg-gray-200/50 hover:stroke-gray-600 active:stroke-gray-900 ui-not-focus-visible:outline-none"
              aria-label="Toggle site navigation"
            >
              {({ open }) =>
                open ? (
                  <ChevronUpIcon className="size-6" />
                ) : (
                  <MenuIcon className="size-6" />
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
                    className="absolute inset-x-0 top-0 z-0 origin-top items-center rounded-b-2xl bg-gray-50 px-6 pb-6 pt-20 shadow-2xl shadow-gray-900/20 backdrop-blur lg:pt-32"
                  >
                    <div className="space-y-4">
                      {links.map(([label, href], index) => (
                        <MobileNavLink key={index} href={href}>
                          <span className="flex items-center">
                            {label}
                            {label === "AI Tools" && (
                              <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                                New
                              </span>
                            )}
                          </span>
                        </MobileNavLink>
                      ))}
                    </div>

                    <div className="mt-8 flex flex-col gap-2">
                      {!user ? (
                        <>
                          <Popover.Button
                            as={Button}
                            href="/register"
                            variant="outline"
                          >
                            Register
                          </Popover.Button>
                          <Popover.Button
                            as={Button}
                            href="/login"
                            variant="solid"
                          >
                            Login
                          </Popover.Button>
                        </>
                      ) : (
                        <Popover.Button
                          as={Button}
                          onClick={() => {
                            handleSignOut();
                          }}
                          variant="solid"
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

      {!user ? (
        <>
          <Button
            href="/register"
            variant="outline"
            className="hidden lg:block"
          >
            Register
          </Button>
          <Button href="/login" variant="solid" className="hidden lg:block">
            Login
          </Button>
        </>
      ) : (
        <Button
          onClick={() => {
            handleSignOut();
          }}
          type="button"
          variant="outline"
          className="hidden lg:block"
        >
          Sign Out
        </Button>
      )}
    </div>
  );
}
