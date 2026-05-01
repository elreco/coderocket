import type { Metadata } from "next";

import { UserIntegration } from "@/utils/integrations";
import { buildAppUrl } from "@/utils/runtime-config";
import { createClient } from "@/utils/supabase/server";

import { getSubscription } from "../supabase-server";

import { getServerIntegrations } from "./account/integrations/actions";
import { getAllPublicChats } from "./components/actions";
import Hero from "./hero";

export const revalidate = 60;

export const metadata: Metadata = {
  title:
    "CodeRocket - Open Source AI Website Builder for Tailwind, Next.js and Supabase",
  description:
    "CodeRocket is an open source AI website builder and component generator. Build production-ready Tailwind websites with AI, self-host the stack, and use GitHub, Next.js, Supabase and the integrated builder in one workflow.",
  keywords: [
    "open source ai website builder",
    "self-hosted website builder",
    "tailwind ai website builder",
    "next.js ai builder",
    "supabase ai builder",
    "github website builder",
    "open source tailwind builder",
    "ai component generator",
    "coderocket",
  ],
  openGraph: {
    title:
      "CodeRocket - Open Source AI Website Builder for Tailwind, Next.js and Supabase",
    description:
      "Build production-ready websites and UI components with AI, self-host the stack, and explore the open source CodeRocket workflow.",
    url: buildAppUrl("/"),
  },
  alternates: {
    canonical: buildAppUrl("/"),
  },
};

export default async function Home() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const popularComponents = await getAllPublicChats(
    24,
    0,
    "top",
    undefined,
    undefined,
    false,
    false,
    user,
  );

  let initialSubscription = null;
  let initialIntegrations: UserIntegration[] = [];

  if (user?.id) {
    const [subscription, integrations] = await Promise.all([
      getSubscription(user.id),
      getServerIntegrations(),
    ]);
    initialSubscription = subscription;
    initialIntegrations = integrations;
  }

  return (
    <Hero
      popularComponents={popularComponents}
      initialIsLoggedIn={!!user}
      initialSubscription={initialSubscription}
      initialIntegrations={initialIntegrations}
    />
  );
}
