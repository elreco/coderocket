import Hero from "@/app/hero";
import Pricing from "@/app/pricing";
import {
  getSession,
  getSubscription,
  getActiveProductsWithPrices,
} from "@/app/supabase-server";

export default async function PricingPage() {
  const [session, subscription, products] = await Promise.all([
    getSession(),
    getSubscription(),
    getActiveProductsWithPrices(),
  ]);

  return (
    <>
      <Hero session={session} />
      {/* <Pricing
        session={session}
        user={session?.user}
        subscription={subscription}
        products={products}
      /> */}
    </>
  );
}
