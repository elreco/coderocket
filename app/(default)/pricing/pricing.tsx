"use client";

import { User } from "@supabase/supabase-js";
import { Check, XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types_db";
import {
  PRO_PLAN_MESSAGES_PER_PERIOD,
  STARTER_PLAN_MESSAGES_PER_PERIOD,
  TRIAL_PLAN_MESSAGES_PER_DAY,
} from "@/utils/config";
import { postData } from "@/utils/helpers";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type Price = Database["public"]["Tables"]["prices"]["Row"];
interface ProductWithPrices extends Product {
  prices: Price[];
}
interface PriceWithProduct extends Price {
  products: Product | null;
}
interface SubscriptionWithProduct extends Subscription {
  prices: PriceWithProduct | null;
}

interface Props {
  user: User | null | undefined;
  products: ProductWithPrices[];
  subscription: SubscriptionWithProduct | null;
}

export default function Pricing({ user, products, subscription }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "You must subscribe",
        description: error,
        duration: 5000,
      });
    }
  }, [error]);

  const [priceIdLoading, setPriceIdLoading] = useState<string>();

  const handleCheckout = async (price: Price) => {
    setPriceIdLoading(price.id);
    if (!user) {
      return router.push("/login");
    }
    if (subscription) {
      return router.push("/account");
    }
    try {
      const data = await postData({
        url: "/api/create-checkout-session",
        data: { price },
      });

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return alert((error as Error)?.message);
    } finally {
      setPriceIdLoading(undefined);
    }
  };

  // Calculer l'économie par rapport au plan Starter
  /* const calculateSavings = (currentPrice: number, starterPrice: number) => {
    return Math.round(((starterPrice - currentPrice) / starterPrice) * 100);
  }; */

  // Fonction pour formater le prix
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  if (products.length >= 1) {
    return (
      <div className="flex items-center">
        <div className="my-4 size-full items-center space-y-4 sm:my-4 sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0 lg:mx-auto lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-3 xl:space-y-0">
          {/* Plan Trial */}
          <div className="flex h-full flex-col divide-y divide-border rounded-lg border bg-card p-3">
            <h3 className="mb-4 pl-3 text-lg font-bold text-white">Trial</h3>
            <div className="grow p-3">
              <p>
                <span className="text-5xl font-bold text-primary">$0</span>
                <span className="text-base font-medium text-white">/month</span>
              </p>
              <p className="mt-4 ">
                <span className="font-bold">Start for free!</span> No payment
                required. Explore Tailwind AI and see how it can boost your
                workflow.
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <Check className="mr-2 size-4 text-emerald-500" />{" "}
                {TRIAL_PLAN_MESSAGES_PER_DAY} messages per day
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="mr-2 size-4 text-border" /> Improve prompt
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="mr-2 size-4 text-border" /> Generate with
                Image
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="mr-2 size-4 text-border" /> AI Full Power
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="mr-2 size-4 text-border" /> Support
              </p>
            </div>
            <Button
              variant="default"
              type="button"
              disabled={false}
              onClick={() =>
                user ? router.push("/account") : router.push("/register")
              }
              className="mt-12 block w-full rounded-full text-white"
            >
              {user ? "Manage" : "Sign up"}
            </Button>
          </div>

          {/* Plans payants */}
          {products
            .flatMap((product) =>
              product.prices.map((price) => ({ product, price })),
            )
            .sort(
              (a, b) => (a.price.unit_amount || 0) - (b.price.unit_amount || 0),
            )
            .map(({ product, price }) => {
              const priceString = formatPrice(
                price.unit_amount || 0,
                price.currency!,
              );

              /* // Calculer l'économie par rapport au plan Starter
              const starterPrice = 180 * 100; // Convert to cents
              const savings =
                price.description !== "Starter"
                  ? calculateSavings(price.unit_amount || 0, starterPrice)
                  : null; */

              // Description personnalisée basée sur le nom du produit
              const planDescription =
                product.name === "Starter" ? (
                  <p className="mt-4 ">
                    <span className="font-bold">Perfect for starters!</span>{" "}
                    Generate with Image included.
                  </p>
                ) : product.name === "Pro" ? (
                  <p className="mt-4 ">
                    <span className="font-bold">Go Pro!</span> Unlock advanced
                    features like AI Full Power for seamless workflows.
                  </p>
                ) : (
                  <p className="mt-4 ">
                    <span className="font-bold">❤️ Support Tailwind AI</span>
                    &apos;s development while enjoying the best value!
                  </p>
                );

              return (
                <div
                  key={price.id}
                  className="flex h-full flex-col divide-y divide-border rounded-lg border bg-card p-3"
                >
                  <h3 className="mb-4 pl-3 text-lg font-bold text-white">
                    {product.name}
                  </h3>
                  <div className="grow p-3">
                    <p>
                      <span className="text-5xl font-bold text-primary">
                        {priceString}
                      </span>
                      <span className="text-base font-medium text-white">
                        /{price.interval}
                      </span>
                    </p>
                    {planDescription}
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" />{" "}
                      Generate with Image
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" /> Improve
                      prompt
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" />
                      {product.name === "Starter"
                        ? STARTER_PLAN_MESSAGES_PER_PERIOD
                        : PRO_PLAN_MESSAGES_PER_PERIOD}{" "}
                      messages per month
                    </p>

                    {product.name === "Starter" ? (
                      <>
                        <p className="mt-4 flex items-center text-sm font-medium ">
                          <Check className="mr-2 size-4 text-emerald-500" />{" "}
                          Support
                        </p>
                        <p className="mt-4 flex items-center text-sm font-medium ">
                          <XIcon className="mr-2 size-4 text-border" /> AI Full
                          Power
                        </p>
                        <p className="mt-4 flex items-center text-sm font-medium ">
                          <XIcon className="mr-2 size-4 text-border" /> Extended
                          support
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-4 flex items-center text-sm font-medium ">
                          <Check className="mr-2 size-4 text-emerald-500" />{" "}
                          Extended support
                        </p>
                        <p className="mt-4 flex items-center text-sm font-medium ">
                          <Check className="mr-2 size-4 text-emerald-500" /> AI
                          Full Power
                        </p>
                      </>
                    )}
                  </div>
                  <Button
                    variant="default"
                    type="button"
                    disabled={false}
                    loading={priceIdLoading === price.id}
                    onClick={() => handleCheckout(price)}
                    className="block w-full rounded-full text-white"
                  >
                    {product.name === subscription?.prices?.products?.name
                      ? "Manage"
                      : "Subscribe"}
                  </Button>
                </div>
              );
            })}
        </div>
      </div>
    );
  }
}
