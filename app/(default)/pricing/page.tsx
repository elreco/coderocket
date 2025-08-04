import {
  getSubscription,
  getActiveProductsWithPrices,
} from "@/app/supabase-server";
import { Container } from "@/components/container";
import Faq from "@/components/faq";
import { PageTitle } from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/utils/supabase/server";

import Pricing from "./pricing";

export const metadata = {
  title: `Pricing - CodeRocket`,
  description:
    "Start building for free, then add a site plan to go live. Account plans unlock additional features.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const supabase = await createClient();
  const [userData, subscription, products] = await Promise.all([
    supabase.auth.getUser(),
    getSubscription(),
    getActiveProductsWithPrices(),
  ]);

  return (
    <Container className="pr-2 sm:pr-11">
      <PageTitle title="Pricing Plans" subtitle="Start building for free" />

      {reason === "marketplace-create" && (
        <div className="mb-8">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              <strong>Premium subscription required</strong> - To create
              listings on the marketplace and earn money from sales, you need a
              premium subscription. Upgrade now to start selling your
              components!
            </AlertDescription>
          </Alert>
        </div>
      )}

      {reason === "marketplace-stripe" && (
        <div className="mb-8">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              <strong>Premium subscription required</strong> - To set up payment
              processing and receive earnings from marketplace sales, you need a
              premium subscription. Upgrade now to configure your Stripe
              account!
            </AlertDescription>
          </Alert>
        </div>
      )}

      {reason === "marketplace-listings" && (
        <div className="mb-8">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              <strong>Premium subscription required</strong> - To manage your
              marketplace listings and track sales, you need a premium
              subscription. Upgrade now to access your seller dashboard!
            </AlertDescription>
          </Alert>
        </div>
      )}

      {reason === "marketplace-earnings" && (
        <div className="mb-8">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              <strong>Premium subscription required</strong> - To view your
              marketplace earnings and manage payouts, you need a premium
              subscription. Upgrade now to access your financial dashboard!
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Pricing
        user={userData.data.user}
        products={products}
        subscription={subscription}
      />
      <div className="mt-4 grid grid-cols-1 pb-40 sm:mt-10 lg:grid-cols-2">
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
