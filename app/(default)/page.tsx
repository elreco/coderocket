import { createClient } from "@/utils/supabase/server";

import { getAllPublicChats } from "./components/actions";
import Hero from "./hero";

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

  return (
    <Hero popularComponents={popularComponents} initialIsLoggedIn={!!user} />
  );
}
