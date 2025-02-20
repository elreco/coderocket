export const fetchCache = "force-no-store";
export const revalidate = 0;
export const maxDuration = 300;

import { Terminal, Globe } from "lucide-react";
import Link from "next/link";

import { getHTMLChatsFromUser } from "@/app/(default)/components/actions";
import ComponentCard from "@/components/component-card";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: `My HTML components - Tailwind AI`,
  description:
    "My last Tailwind HTML components generated with AI by our users with React and HTML",
};

export default async function MyHTMLComponents() {
  const chats = await getHTMLChatsFromUser();
  return (
    <Container className="pr-2 sm:pr-11">
      <PageTitle
        title="My HTML Components"
        subtitle="My generated HTML components"
      />
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
      <div className="grid grid-cols-1 gap-x-4 gap-y-10 pb-20 lg:grid-cols-2  xl:grid-cols-3 2xl:grid-cols-4">
        {chats?.map((chat) => <ComponentCard key={chat.chat_id} chat={chat} />)}
      </div>
    </Container>
  );
}
