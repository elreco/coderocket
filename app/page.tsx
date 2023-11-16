import Hero from "@/app/hero";
import {
  getSession,
  getSubscription,
  getActiveProductsWithPrices,
} from "@/app/supabase-server";

export default async function PricingPage() {
  const [session] = await Promise.all([
    getSession(),
    getSubscription(),
    getActiveProductsWithPrices(),
  ]);

  return (
    <>
      <Hero session={session} />
    </>
  );
}
