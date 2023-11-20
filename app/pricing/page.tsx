import {
  getSession,
  getSubscription,
  getActiveProductsWithPrices,
} from "@/app/supabase-server";

import Pricing from "./Pricing";

export default async function PricingPage() {
  const [session, subscription, products] = await Promise.all([
    getSession(),
    getSubscription(),
    getActiveProductsWithPrices(),
  ]);

  return (
    <>
      <Pricing
        session={session}
        user={session?.user}
        products={products}
        subscription={subscription}
      />
    </>
  );
}
