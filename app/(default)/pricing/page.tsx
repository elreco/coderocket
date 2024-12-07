import {
  getSubscription,
  getActiveProductsWithPrices,
} from "@/app/supabase-server";
import { Container } from "@/components/container";
import Faq from "@/components/faq";
import { createClient } from "@/utils/supabase/server";

import Pricing from "./pricing";

export const metadata = {
  title: `Pricing - Tailwind AI`,
  description:
    "Start building for free, then add a site plan to go live. Account plans unlock additional features.",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const [userData, subscription, products] = await Promise.all([
    supabase.auth.getUser(),
    getSubscription(),
    getActiveProductsWithPrices(),
  ]);

  return (
    <Container className="pr-2 sm:pr-11">
      <Pricing
        user={userData.data.user}
        products={products}
        subscription={subscription}
      />
      <div className="mt-10 grid grid-cols-1 pb-40 sm:mt-0 lg:grid-cols-2">
        <div>
          <h1 className="text-left text-2xl font-medium">How it works?</h1>
          <p className="mt-8 max-w-2xl text-left text-base">
            Generate components effortlessly with simple prompts, iterate
            seamlessly, and use vision technology to create components from
            images, ensuring flexibility and innovation in your projects.
          </p>
        </div>
        <div className="mt-10 lg:mt-0">
          <Faq />
        </div>
      </div>
    </Container>
  );
}
