import { getSession } from "../supabase-server";

import Hero from "./hero";

export default async function Home() {
  const session = await getSession();

  return (
    <>
      <Hero session={session} />
    </>
  );
}
