import Hero from "@/app/hero";
import Pricing from "@/app/pricing";
import {
  getSession,
  getSubscription,
  getActiveProductsWithPrices,
} from "@/app/supabase-server";

export default async function PricingPage() {
  const [session, products, subscription] = await Promise.all([
    getSession(),
    getActiveProductsWithPrices(),
    getSubscription(),
  ]);

  return (
    <>
      <Hero />
    </>
  );
}
