"use client";

import { User } from "@supabase/supabase-js";
import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types_db";
import { postData } from "@/utils/helpers";
import { getStripe } from "@/utils/stripe-client";

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
  const paymentRequired = searchParams.get("paymentRequired");

  useEffect(() => {
    if (paymentRequired === "true") {
      toast({
        variant: "destructive",
        title: "You must subscribe",
        description:
          "With a free account, you are limited to generating one component with four versions, and image use is not permitted. Upgrade to our premium plan for unlimited access to all features.",
        duration: 5000,
      });
    }
  }, [paymentRequired]);

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
      const { sessionId } = await postData({
        url: "/api/create-checkout-session",
        data: { price },
      });

      const stripe = await getStripe();
      stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      return alert((error as Error)?.message);
    } finally {
      setPriceIdLoading(undefined);
    }
  };

  if (products.length === 1)
    return (
      <div className="min-h-screen">
        <PageTitle
          title="Pricing Plans"
          subtitle="Start building for free, then add a site plan to go live. Account plans unlock additional features."
        />
        <h3 className="text-sm">
          With a free account, you are limited to generating one component with
          four versions, and image use is not permitted. Upgrade to our premium
          plan for unlimited access to all features.
        </h3>
        <div className="flex size-full flex-1 grow items-center">
          <div className="mt-6 size-full items-center space-y-4 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0 lg:mx-auto lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-3 xl:space-y-0">
            {products[0].prices?.map((price) => {
              const priceString =
                price.unit_amount &&
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: price.currency!,
                  minimumFractionDigits: 0,
                }).format(price.unit_amount / 100);

              return (
                <div
                  key={price.interval}
                  className="divide-y divide-zinc-600 rounded-lg border bg-card"
                >
                  <div className="p-6">
                    <p>
                      <span className="text-5xl font-bold text-primary">
                        {priceString}
                      </span>
                      <span className="text-base font-medium ">
                        /{price.interval}
                      </span>
                    </p>
                    <p className="mt-4 ">{price.description}</p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" />{" "}
                      Unlimited credits
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" />{" "}
                      Unlimited versions
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium ">
                      <Check className="mr-2 size-4 text-emerald-500" /> Fast
                      generation
                    </p>
                    <Button
                      variant="default"
                      type="button"
                      disabled={false}
                      loading={priceIdLoading === price.id}
                      onClick={() => handleCheckout(price)}
                      className="mt-12 block w-full"
                    >
                      {products[0].name === subscription?.prices?.products?.name
                        ? "Manage"
                        : "Subscribe"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
}
