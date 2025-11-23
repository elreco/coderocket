import Faq from "@/app/(default)/faq/faq";
import {
  getSubscription,
  getActiveProductsWithPrices,
} from "@/app/supabase-server";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/utils/supabase/server";

import Pricing from "./pricing";

export const metadata = {
  title: "Pricing - CodeRocket Tailwind AI Website Builder",
  description:
    "Start building AI-powered Tailwind websites for free with CodeRocket (formerly Tailwind AI). Premium plans unlock unlimited components, website cloning, GitHub integration, custom domains, and more. Try free, upgrade anytime.",
  keywords:
    "tailwind ai pricing, Tailwind AI pricing, CodeRocket pricing, AI website builder pricing, Tailwind generator cost, web development pricing, AI tool subscription, tailwind ai cost",
  openGraph: {
    title: "Pricing - CodeRocket Tailwind AI Website Builder",
    description:
      "Start free, upgrade to premium for unlimited AI-powered Tailwind components and website generation. Created with CodeRocket (formerly Tailwind AI).",
    url: "https://www.coderocket.app/pricing",
  },
  alternates: {
    canonical: "https://www.coderocket.app/pricing",
  },
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

      {reason === "templates-create" && (
        <div className="mb-8">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              <strong>Premium subscription required</strong> - To create premium
              templates and earn money from sales, you need a premium
              subscription. You can still create free templates without a
              subscription. Upgrade now to start earning from your templates!
            </AlertDescription>
          </Alert>
        </div>
      )}

      {reason === "templates-stripe" && (
        <div className="mb-8">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              <strong>Premium subscription required</strong> - To set up payment
              processing and receive earnings from template sales, you need a
              premium subscription. Upgrade now to configure your Stripe account
              and start earning!
            </AlertDescription>
          </Alert>
        </div>
      )}

      {reason === "templates-listings" && (
        <div className="mb-8">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              <strong>Premium subscription required</strong> - To manage your
              premium templates and track earnings, you need a premium
              subscription. You can still create free templates without a
              subscription. Upgrade now to access your template dashboard!
            </AlertDescription>
          </Alert>
        </div>
      )}

      {reason === "templates-earnings" && (
        <div className="mb-8">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              <strong>Premium subscription required</strong> - To view your
              template earnings and manage payouts, you need a premium
              subscription. Upgrade now to access your financial dashboard!
            </AlertDescription>
          </Alert>
        </div>
      )}

      {reason === "limit-exceeded" && (
        <div className="mb-8">
          <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>Rocket limit reached</strong> - You have reached your
              monthly limit of Rockets. Upgrade to a paid plan or purchase
              additional Rockets to continue creating components.
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
