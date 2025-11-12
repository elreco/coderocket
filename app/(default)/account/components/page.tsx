export const fetchCache = "force-no-store";
export const revalidate = 0;
export const maxDuration = 300;

import { Terminal, Globe } from "lucide-react";
import Link from "next/link";

import { getAllPublicChats } from "@/app/(default)/components/actions";
import { ComponentsInfiniteScroll } from "@/components/components-infinite-scroll";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Framework } from "@/utils/config";

export const metadata = {
  title: `My components - CodeRocket`,
  description:
    "My last Tailwind HTML components generated with AI by our users with React, Vue, and HTML",
};

export default async function AccountComponents({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; frameworks?: string }>;
}) {
  const { search, frameworks } = await searchParams;
  const searchQuery = search || "";
  const initialSelectedFrameworks = frameworks
    ? frameworks.split(",").map((framework) => framework as Framework)
    : [];
  const initialChats = await getAllPublicChats(
    16,
    0,
    false,
    searchQuery,
    initialSelectedFrameworks,
    true,
  );
  return (
    <Container className="pr-2 sm:pr-11">
      <PageTitle title="My Components" subtitle="All my generated components" />
      <div className="mb-8 flex gap-4">
        <Button asChild>
          <Link href="/" className="flex items-center gap-2">
            <Terminal className="size-4" />
            <span>Generate a component</span>
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/components" className="flex items-center gap-2">
            <Globe className="size-4" />
            <span>Browse Public Components</span>
          </Link>
        </Button>
      </div>
      <ComponentsInfiniteScroll
        initialChats={initialChats}
        initialSearchQuery={searchQuery}
        initialSelectedFrameworks={initialSelectedFrameworks}
        isAccountPage={true}
      />
    </Container>
  );
}
