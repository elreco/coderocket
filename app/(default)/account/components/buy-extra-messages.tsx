"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { postData } from "@/utils/helpers";

export function BuyExtraMessages() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const buyRockets = searchParams.get("buy_rockets");

  const purchasedRockets = searchParams.get("rockets");

  if (purchasedRockets) {
    toast({
      title: "Purchase successful!",
      description: `You have successfully purchased ${parseInt(purchasedRockets || "0")} Rocket${
        parseInt(purchasedRockets || "0") > 1 ? "s" : ""
      } (extra, 1 generation each). 🚀`,
      duration: 5000,
    });
    router.replace("/account");
  }

  // Scroll to this section if coming from pricing page
  if (buyRockets && typeof window !== "undefined") {
    setTimeout(() => {
      const element = document.getElementById("buy-rockets-section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      router.replace("/account");
    }, 100);
  }

  const handleIncrement = () => {
    setQuantity(quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setQuantity(value);
    }
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const data = await postData({
        url: "/api/purchase-extra-message",
        data: { quantity },
      });

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while processing your purchase.",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalPrice = quantity;

  return (
    <Card
      id="buy-rockets-section"
      className="bg-card w-full rounded-md border p-5"
    >
      <h3 className="mb-1 flex items-center gap-2 text-2xl font-medium">
        🚀 Buy Rockets
      </h3>
      <p className="mb-4">
        Need more generations? Purchase Extra Rockets for $1 each. These are
        consumed after you reach your monthly Rocket quota.
      </p>

      <div className="mb-6 flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={quantity <= 1}
          >
            <Minus className="size-4" />
          </Button>

          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={handleInputChange}
            className="w-20 text-center"
          />

          <Button variant="outline" size="icon" onClick={handleIncrement}>
            <Plus className="size-4" />
          </Button>

          <div className="ml-4 text-lg font-medium">
            ${totalPrice.toFixed(2)} for {quantity} 🚀 Extra Rocket
            {quantity > 1 ? "s" : ""}
          </div>
        </div>

        <Button onClick={handlePurchase} className="w-1/2" loading={isLoading}>
          <ShoppingCart className="mr-2 size-4" />
          Purchase {quantity} Extra Rocket{quantity > 1 ? "s" : ""}
        </Button>
      </div>

      <div className="bg-muted rounded-lg p-3 text-sm">
        <p className="font-medium">How Rockets work</p>
        <p className="text-muted-foreground mt-1">
          Monthly plan Rockets are token-based (1 Rocket = 10,000 AI tokens).
          Extra Rockets are booster credits: 1 Extra Rocket = 1 additional
          generation after your monthly limit. Extra Rockets never expire and
          stack with your plan.
        </p>
      </div>
    </Card>
  );
}
