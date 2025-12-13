import { UserIntegration } from "@/utils/integrations";
import { createClient } from "@/utils/supabase/server";

import { getSubscription } from "../supabase-server";

import { getServerIntegrations } from "./account/integrations/actions";
import { getAllPublicChats } from "./components/actions";
import Hero from "./hero";

export const revalidate = 60;

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
