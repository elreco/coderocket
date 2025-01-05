"use client";

import { User } from "@supabase/supabase-js";
import { Check, XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types_db";
import { MAX_GENERATIONS, MAX_ITERATIONS } from "@/utils/config";
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
      <div className="flex items-center">
        <div className="my-4 size-full items-center space-y-4 sm:my-4 sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0 lg:mx-auto lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-4 xl:space-y-0">
          <div className="flex h-full flex-col divide-y divide-zinc-600 rounded-lg border bg-card p-3">
            <div className="grow p-3">
              <p>
                <span className="text-5xl font-bold text-primary">Free</span>
              </p>
              <p className="mt-4 ">
                Experience the full potential of Tailwind AI in your workflow
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <Check className="mr-2 size-4 text-emerald-500" />{" "}
                {MAX_GENERATIONS} component
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <Check className="mr-2 size-4 text-emerald-500" />{" "}
                {MAX_ITERATIONS} versions
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="mr-2 size-4 text-red-500" /> Generate with
                Image
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="mr-2 size-4 text-red-500" /> AI Full Power
              </p>
              <p className="mt-4 flex items-center text-sm font-medium ">
                <XIcon className="mr-2 size-4 text-red-500" /> Extended support
              </p>
            </div>
            <Button
              variant="default"
              type="button"
              disabled={false}
              onClick={() =>
                user ? router.push("/account") : router.push("/register")
              }
              className="mt-12 block w-full"
            >
              {user ? "Manage" : "Sign up"}
            </Button>
          </div>

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
                className="flex h-full flex-col divide-y divide-zinc-600 rounded-lg border bg-card p-3"
              >
                <div className="grow p-3">
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
                    <Check className="mr-2 size-4 text-emerald-500" /> Unlimited
                    components
                  </p>
                  <p className="mt-4 flex items-center text-sm font-medium ">
                    <Check className="mr-2 size-4 text-emerald-500" /> Unlimited
                    versions
                  </p>
                  <p className="mt-4 flex items-center text-sm font-medium ">
                    <Check className="mr-2 size-4 text-emerald-500" /> Generate
                    with Image
                  </p>
                  <p className="mt-4 flex items-center text-sm font-medium ">
                    <Check className="mr-2 size-4 text-emerald-500" />
                    AI Full Power
                  </p>
                  <p className="mt-4 flex items-center text-sm font-medium ">
                    <Check className="mr-2 size-4 text-emerald-500" />
                    Extended support
                  </p>
                </div>
                <Button
                  variant="default"
                  type="button"
                  disabled={false}
                  loading={priceIdLoading === price.id}
                  onClick={() => handleCheckout(price)}
                  className="block w-full"
                >
                  {products[0].name === subscription?.prices?.products?.name
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
