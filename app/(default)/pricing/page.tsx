import {
  getSubscription,
  getActiveProductsWithPrices,
} from "@/app/supabase-server";
import { createClient } from "@/utils/supabase/server";

import Pricing from "./Pricing";

export default async function PricingPage() {
  const supabase = createClient();
  const [userData, subscription, products] = await Promise.all([
    supabase.auth.getUser(),
    getSubscription(),
    getActiveProductsWithPrices(),
  ]);

  return (
    <>
      <Pricing
        user={userData.data.user}
        products={products}
        subscription={subscription}
      />
    </>
  );
}
