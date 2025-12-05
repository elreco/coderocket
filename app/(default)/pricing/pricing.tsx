"use client";

import { User } from "@supabase/supabase-js";
import { Check, XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types_db";
import {
  FREE_CHAR_LIMIT,
  PREMIUM_CHAR_LIMIT,
  FILE_LIMITS_PER_PLAN,
} from "@/utils/config";
import { postData } from "@/utils/helpers";
import { ROCKET_LIMITS_PER_PLAN } from "@/utils/rocket-conversion";

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
        duration: 4000,
      });
    }
  }, [error, toast]);

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

  // Calculer l'économie par rapport au coût par message
  const calculateSavings = (product: ProductWithPrices) => {
    const starterPrice =
      products.flatMap((p) => p.prices).find((p) => p.description === "Starter")
        ?.unit_amount || 0;

    const starterRockets = ROCKET_LIMITS_PER_PLAN.starter.monthly_rockets;
    const starterCostPerRocket = starterPrice / starterRockets / 100;

    const productRockets =
      ROCKET_LIMITS_PER_PLAN[
        (product.name?.toLowerCase() ||
          "free") as keyof typeof ROCKET_LIMITS_PER_PLAN
      ]?.monthly_rockets || 0;

    const productPrice = product.prices[0]?.unit_amount || 0;
    const productCostPerRocket = productPrice / productRockets / 100;

    if (
      starterCostPerRocket > 0 &&
      productCostPerRocket < starterCostPerRocket
    ) {
      return Math.round(
        ((starterCostPerRocket - productCostPerRocket) / starterCostPerRocket) *
          100,
      );
    }

    return 0;
  };

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
      <div className="flex flex-col items-center">
        <div className="my-4 size-full items-center space-y-4 sm:my-4 sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0 lg:mx-auto lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-4 xl:space-y-0">
          {/* Plan Trial */}
          <div className="bg-card flex h-full flex-col rounded-lg border p-3">
            <h3 className="mb-4 pl-3 text-lg font-bold text-white">Trial</h3>
            <div className="grow p-3">
              <p>
                <span className="text-primary text-5xl font-bold">$0</span>
                <span className="text-base font-medium text-white">/month</span>
              </p>
              <p className="mt-4 ">
                <span className="font-bold">Start for free!</span> No payment
                required. Explore CodeRocket and see how it can boost your
                workflow.
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <Check className="mr-2 size-4 text-emerald-500" />{" "}
                {ROCKET_LIMITS_PER_PLAN.free.monthly_rockets} 🚀 Rockets per
                month ({ROCKET_LIMITS_PER_PLAN.free.description})
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <Check className="mr-2 size-4 text-emerald-500" />{" "}
                {FREE_CHAR_LIMIT} characters limit per prompt
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="text-border mr-2 size-4" /> Improve prompt
              </p>

              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="text-border mr-2 size-4" /> Generate with
                files
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="text-border mr-2 size-4" /> File library
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="text-border mr-2 size-4" /> AI Full Power
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="text-border mr-2 size-4" /> GitHub Sync
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="text-border mr-2 size-4" /> Support
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

              const savings = calculateSavings(product);

              // Description personnalisée basée sur le nom du produit
              const planDescription =
                product.name === "Starter" ? (
                  <p className="mt-4 ">
                    <span className="font-bold">Perfect for starters!</span>{" "}
                    Generate with files included.
                  </p>
                ) : product.name === "Pro" ? (
                  <p className="mt-4 ">
                    <span className="font-bold">Go Pro!</span> Unlock advanced
                    features like AI Full Power for seamless workflows.
                  </p>
                ) : (
                  <p className="mt-4 ">
                    <span className="font-bold">❤️ Support CodeRocket</span>
                    &apos;s development while enjoying the best value!
                  </p>
                );

              return (
                <div
                  key={price.id}
                  className="bg-card flex h-full flex-col rounded-lg border p-3"
                >
                  <h3 className="mb-4 pl-3 text-lg font-bold text-white">
                    {product.name}
                  </h3>
                  <div className="relative grow p-3">
                    {savings > 0 && (
                      <div className="absolute top-2 right-2 rounded-md bg-emerald-500 px-2 py-1 text-xs font-bold text-white">
                        Save {savings}%
                      </div>
                    )}
                    <p>
                      <span className="text-primary text-5xl font-bold">
                        {priceString}
                      </span>
                      <span className="text-base font-medium text-white">
                        /{price.interval}
                      </span>
                    </p>
                    {planDescription}
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" />{" "}
                      Generate with files
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" />{" "}
                      {product.name === "Starter"
                        ? `${FILE_LIMITS_PER_PLAN.starter} files maximum`
                        : product.name === "Pro"
                          ? `${FILE_LIMITS_PER_PLAN.pro} files maximum`
                          : "Unlimited files"}
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" /> Improve
                      prompt
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" />{" "}
                      {PREMIUM_CHAR_LIMIT} characters limit per prompt
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" />
                      {product.name === "Starter"
                        ? `${ROCKET_LIMITS_PER_PLAN.starter.monthly_rockets.toLocaleString()} 🚀 Rockets per month (${ROCKET_LIMITS_PER_PLAN.starter.description})`
                        : product.name === "Pro"
                          ? `${ROCKET_LIMITS_PER_PLAN.pro.monthly_rockets.toLocaleString()} 🚀 Rockets per month (${ROCKET_LIMITS_PER_PLAN.pro.description})`
                          : `${ROCKET_LIMITS_PER_PLAN.enterprise.monthly_rockets.toLocaleString()} 🚀 Rockets per month (${ROCKET_LIMITS_PER_PLAN.enterprise.description})`}
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" /> All
                      premium features
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" /> GitHub
                      Sync
                    </p>

                    {product.name === "Starter" ? (
                      <>
                        <p className="mt-4 flex items-center text-sm font-medium ">
                          <Check className="mr-2 size-4 text-emerald-500" />{" "}
                          Support
                        </p>
                        <p className="mt-4 flex items-center text-sm font-medium ">
                          <XIcon className="text-border mr-2 size-4" /> AI Full
                          Power
                        </p>
                        <p className="mt-4 flex items-center text-sm font-medium ">
                          <XIcon className="text-border mr-2 size-4" /> Extended
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

        {/* Section pour l'achat de Rockets */}
        <div className="mt-12 w-full max-w-2xl">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="mb-2 flex items-center gap-2 text-xl font-bold">
              🚀 Need More? Buy Rockets!
            </h3>
            <p className="mb-4">
              Reached your monthly limit? Purchase Rockets for just $1 each.
              Each Rocket = 10,000 AI tokens. They never expire and can be used
              anytime you need them.
            </p>
            <p className="text-muted-foreground mb-4 text-sm">
              💡 Your usage is based on actual AI costs with transparent
              pricing. See the exact cost of each generation in real-time in
              your chat.
            </p>
            <Button
              onClick={() => {
                if (!user) {
                  router.push("/login");
                } else {
                  router.push("/account?buy_rockets=true");
                }
              }}
              variant="default"
              className="w-full"
            >
              Buy Rockets 🚀
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
