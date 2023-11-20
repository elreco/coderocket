import Hero from "@/app/hero";
import { getSession } from "@/app/supabase-server";

export default async function Home() {
  const session = await getSession();

  return (
    <>
      <Hero session={session} />
    </>
  );
}
