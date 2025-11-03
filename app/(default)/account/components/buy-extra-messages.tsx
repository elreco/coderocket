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
  const [pairs, setPairs] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier si l'utilisateur vient d'acheter des messages supplémentaires
  const extraMessages = searchParams.get("extra_messages");
  const versions = searchParams.get("versions");

  // Afficher un toast si l'utilisateur vient d'acheter des messages supplémentaires
  if (extraMessages) {
    toast({
      title: "Purchase successful!",
      description: `You have successfully purchased ${versions || Math.ceil(parseInt(extraMessages) / 2)} extra version${
        (versions && parseInt(versions) > 1) ||
        (!versions && Math.ceil(parseInt(extraMessages) / 2) > 1)
          ? "s"
          : ""
      }.`,
      duration: 5000,
    });
    // Rediriger pour supprimer le paramètre de l'URL
    router.replace("/account");
  }

  const handleIncrement = () => {
    setPairs(pairs + 1);
  };

  const handleDecrement = () => {
    if (pairs > 1) {
      setPairs(pairs - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setPairs(value);
    }
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      // Send the number of versions to purchase directly
      const data = await postData({
        url: "/api/purchase-extra-message",
        data: { quantity: pairs },
      });

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while processing your template.",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate price
  const totalPrice = pairs;

  return (
    <Card className="w-full rounded-md border bg-card p-5">
      <h3 className="mb-1 text-2xl font-medium">Buy Extra Versions</h3>
      <p className="mb-4">Need more versions? Purchase versions for $1 each.</p>

      <div className="mb-6 flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={pairs <= 1}
          >
            <Minus className="size-4" />
          </Button>

          <Input
            type="number"
            min="1"
            value={pairs}
            onChange={handleInputChange}
            className="w-20 text-center"
          />

          <Button variant="outline" size="icon" onClick={handleIncrement}>
            <Plus className="size-4" />
          </Button>

          <div className="ml-4 text-lg font-medium">
            ${totalPrice.toFixed(2)} for {pairs} versions
          </div>
        </div>

        <Button onClick={handlePurchase} className="w-1/2" loading={isLoading}>
          <ShoppingCart className="mr-2 size-4" />
          Purchase {pairs} Versions
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          Extra versions never expire and can be used anytime you reach your
          plan&apos;s limit.
        </p>
      </div>
    </Card>
  );
}
