'use client';

import { Button } from '../ui/Button';
import { useSupabase } from '@/app/supabase-provider';
import { Popover } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import { User } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function MenuIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
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
    'as' | 'className'
  >
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
}

export default function MobileNav({ user }: Props) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };
  console.log(user)
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
                      transition: { duration: 0.2 }
                    }}
                    className="absolute inset-x-0 top-0 z-0 origin-top rounded-b-2xl bg-gray-50 px-6 pb-6 pt-32 shadow-2xl shadow-gray-900/20"
                  >
                    <div className="space-y-4">
                      <MobileNavLink href="/#features">Features</MobileNavLink>
                      <MobileNavLink href="/#reviews">Reviews</MobileNavLink>
                      <MobileNavLink href="/#pricing">Pricing</MobileNavLink>
                      <MobileNavLink href="/#faqs">FAQs</MobileNavLink>
                    </div>
                    <div className="mt-8 flex flex-col gap-4">
                    {!user ? (
                      <Button
                        href="/signin"
                        variant="outline"
                      >
                        Log in
                      </Button>
                    ) : (
                      <Button
                      onClick={handleSignOut} variant="outline">
                        Sign Out
                      </Button>
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
        <Button
          href="/signin"
          variant="outline"
          className="hidden lg:block"
        >
          Log in
        </Button>
      ) : (
        <Button
        onClick={handleSignOut} variant="outline" className="hidden lg:block">
          Sign Out
        </Button>
      )}
    </div>
  );
}
